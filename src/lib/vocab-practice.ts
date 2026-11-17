import { allSenses, type SenseRef } from "./content";
import { LEVEL_ORDER } from "./content";
import type { ReviewCardRow, SavedItem } from "./store/types";

/**
 * Topic flashcards on top of the learner's single spaced-repetition deck.
 * - Active recall: the card shows only the English item; the learner answers before revealing.
 * - Spaced repetition: ratings go through FSRS (src/lib/progress.ts); the schedule and every review
 *   are stored per learner (review_cards, review_logs). A word studied here is the same card in
 *   Review and in the Library, so it has one history wherever it was met.
 * - Interleaving: due cards from other topics are mixed in (one in every four).
 * - Progressive difficulty: new items are introduced from the lowest CEFR level upwards, single
 *   words before collocations, phrasal verbs and idioms.
 */
export interface PracticeCard { senseId: string; ref: SenseRef; savedId: string | null; card: ReviewCardRow | null; kind: "due" | "new" | "interleaved" }
export interface TopicStats { total: number; newRemaining: number; learning: number; remembered: number; due: number }

const KIND_RANK: Record<string, number> = { word: 0, phrase: 1, collocation: 1, phrasal_verb: 2, idiom: 3 };
const levelRank = (l: string) => Math.max(0, LEVEL_ORDER.indexOf(l as (typeof LEVEL_ORDER)[number]));

export function topicSenses(theme: string): SenseRef[] {
  return allSenses().filter((r) => r.sense.topics.includes(theme))
    .sort((a, b) => levelRank(a.sense.level) - levelRank(b.sense.level) || (KIND_RANK[a.item.kind] ?? 0) - (KIND_RANK[b.item.kind] ?? 0) || a.item.lemma.localeCompare(b.item.lemma));
}

function index(saved: SavedItem[], cards: ReviewCardRow[]) {
  const savedBySense = new Map(saved.filter((s) => s.itemType === "sense").map((s) => [s.itemRef, s]));
  const cardBySaved = new Map(cards.map((c) => [c.savedItemId, c]));
  return { savedBySense, cardOf: (senseId: string) => { const s = savedBySense.get(senseId); return s ? cardBySaved.get(s.id) ?? null : null; } };
}

export function topicStats(theme: string, saved: SavedItem[], cards: ReviewCardRow[], now = new Date()): TopicStats {
  const { cardOf } = index(saved, cards);
  const senses = topicSenses(theme);
  let newRemaining = 0, learning = 0, remembered = 0, due = 0;
  for (const r of senses) {
    const c = cardOf(r.sense.id);
    if (!c || c.reps === 0) { newRemaining++; continue; }
    if (c.state === 2) remembered++; else learning++;
    if (new Date(c.due) <= now) due++;
  }
  return { total: senses.length, newRemaining, learning, remembered, due };
}

/**
 * A session queue: due cards of this topic (most overdue first), new cards in order of difficulty,
 * and due cards from other topics interleaved. There is no cap on how many sessions a learner can do;
 * `size` only keeps one session to a sensible length.
 */
export function buildPracticeQueue(theme: string, saved: SavedItem[], cards: ReviewCardRow[], opts: { size?: number; newPerSession?: number; now?: Date; exclude?: string[] } = {}): PracticeCard[] {
  const { size = 20, newPerSession = 10, now = new Date(), exclude = [] } = opts;
  const { savedBySense, cardOf } = index(saved, cards);
  const skip = new Set(exclude);
  const inTopic = topicSenses(theme).filter((r) => !skip.has(r.sense.id));
  const dueHere = inTopic.filter((r) => { const c = cardOf(r.sense.id); return c && c.reps > 0 && new Date(c.due) <= now; })
    .sort((a, b) => cardOf(a.sense.id)!.due.localeCompare(cardOf(b.sense.id)!.due));
  const fresh = inTopic.filter((r) => { const c = cardOf(r.sense.id); return !c || c.reps === 0; }).slice(0, newPerSession);
  const others = allSenses().filter((r) => !r.sense.topics.includes(theme) && !skip.has(r.sense.id))
    .filter((r) => { const c = cardOf(r.sense.id); return c && c.reps > 0 && new Date(c.due) <= now; })
    .sort((a, b) => cardOf(a.sense.id)!.due.localeCompare(cardOf(b.sense.id)!.due));

  const mk = (r: SenseRef, kind: PracticeCard["kind"]): PracticeCard => ({ senseId: r.sense.id, ref: r, savedId: savedBySense.get(r.sense.id)?.id ?? null, card: cardOf(r.sense.id), kind });
  const out: PracticeCard[] = [];
  // Alternate review and new material (due first), with an interleaved card every fourth position.
  let d = 0, n = 0, o = 0;
  while (out.length < size && (d < dueHere.length || n < fresh.length || o < others.length)) {
    if (out.length % 4 === 3 && o < others.length) { out.push(mk(others[o++], "interleaved")); continue; }
    const preferDue = d < dueHere.length && (n >= fresh.length || out.filter((c) => c.kind === "due").length <= out.filter((c) => c.kind === "new").length * 2);
    if (preferDue) out.push(mk(dueHere[d++], "due"));
    else if (n < fresh.length) out.push(mk(fresh[n++], "new"));
    else if (o < others.length) out.push(mk(others[o++], "interleaved"));
    else break;
  }
  return out;
}

/** Where a card answered "Again" goes back into the current session (a short learning step). */
export const RELEARN_GAP = 3;
