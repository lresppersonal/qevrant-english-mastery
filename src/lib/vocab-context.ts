import { allSenses, type SenseRef } from "./content";
import { rng } from "./visual/charts";

/**
 * Vocabulary in Context: exercises generated from the database's own original example sentences,
 * so every item, distractor and explanation comes from QEVRANT's entries (no textbook exercises).
 *   gap        – type the missing word (first-letter hint)
 *   choice     – choose the word that fits the sentence (four options, each explained)
 *   form       – complete the sentence with the correct form of the word given in brackets
 *   meaning    – what does the highlighted expression mean in this sentence?
 *   produce    – write your own sentence with the item (checked by AI when available)
 */
export type ContextKind = "gap" | "choice" | "form" | "meaning" | "produce";
export interface ContextOption { text: string; correct: boolean; why: string }
export interface ContextItem {
  id: string; kind: ContextKind; senseId: string; lemma: string; level: string;
  /** sentence with the target replaced by "____" (gap/choice/form) or with **target** highlighted (meaning) */
  sentence: string;
  answer: string;            // the exact form in the sentence
  accepted: string[];        // lower-case accepted answers
  hint?: string;             // first letter + length, or base form
  options?: ContextOption[];
  definition: string; ru: string; collocations: string[];
  /** why the answer fits this sentence */
  fit: string;
  /** another natural example */
  example: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Find the target (lemma, its listed forms or a regular inflection) inside an example sentence. */
export function locate(r: SenseRef, sentence: string): { start: number; text: string } | null {
  const forms = [...new Set([...r.item.forms, r.item.lemma].map((f) => f.toLowerCase()))].sort((a, b) => b.length - a.length);
  for (const f of forms) {
    // allow regular endings on the last word of the form: -s, -es, -ed, -d, -ing, -ies
    const words = f.split(/\s+/).map(esc);
    const last = words.pop()!;
    const stem = last.replace(/e$/, "").replace(/y$/, "");
    const pattern = `\\b${[...words, `(?:${last}|${stem}(?:s|es|ed|d|ing|ies|ied))`].join("\\s+")}\\b`;
    const m = new RegExp(pattern, "i").exec(sentence);
    if (m) return { start: m.index, text: m[0] };
  }
  return null;
}

const blank = (s: string, at: { start: number; text: string }) => s.slice(0, at.start) + "____" + s.slice(at.start + at.text.length);
const highlight = (s: string, at: { start: number; text: string }) => s.slice(0, at.start) + "**" + at.text + "**" + s.slice(at.start + at.text.length);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const content = (w: string) => w.length > 2 && !["the", "and", "for", "with", "into", "from", "that", "this", "something", "someone", "sth", "sb"].includes(w);
function fitFor(r: SenseRef, sentence: string): string {
  const own = new Set(r.item.lemma.toLowerCase().split(/\s+/));
  const low = sentence.toLowerCase();
  const col = r.sense.collocations.map((c) => c.split(/[;/]/)[0].replace(/\(.*?\)/g, "").trim())
    .find((c) => c.toLowerCase().split(/\s+/).filter((w) => content(w) && !own.has(w)).some((w) => new RegExp(`\\b${esc(w)}`).test(low)));
  return col ? `It fits the meaning (“${r.sense.definition}”) and forms a natural collocation here: *${col}*.`
    : `It fits the meaning the sentence needs: “${r.sense.definition}”.`;
}

/**
 * Distractors. For "choose the word" the options come from OTHER themes (same kind and part of speech,
 * similar level), and any candidate whose collocations share a content word with the sentence is
 * excluded, so only one option can fit. For "what does it mean" the options are same-theme meanings.
 */
function distractors(r: SenseRef, pool: SenseRef[], rand: () => number, sentence: string | null, n = 3) {
  const pos = r.item.pos.split(/\s/)[0];
  const lvl = (l: string) => ["B2", "B2+", "C1", "C2"].indexOf(l);
  const words = sentence ? new Set(sentence.toLowerCase().split(/[^a-z'-]+/).filter(content)) : null;
  const syn = new Set(r.sense.synonyms.map((x) => x.toLowerCase()));
  const cand = pool.filter((x) => x.sense.id !== r.sense.id && x.item.lemma.toLowerCase() !== r.item.lemma.toLowerCase() && !syn.has(x.item.lemma.toLowerCase())
    && x.item.kind === r.item.kind && x.item.pos.split(/\s/)[0] === pos && Math.abs(lvl(x.sense.level) - lvl(r.sense.level)) <= 1
    && (!words || !x.sense.collocations.some((c) => c.toLowerCase().split(/[^a-z'-]+/).filter(content).some((w) => w !== x.item.lemma.toLowerCase() && words.has(w)))));
  const shuffled = cand.map((x) => ({ x, k: rand() })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const seen = new Set<string>();
  return shuffled.filter((x) => (seen.has(x.item.lemma) ? false : (seen.add(x.item.lemma), true))).slice(0, n);
}

export function contextItem(r: SenseRef, kind: ContextKind, pool: SenseRef[], seed: number): ContextItem | null {
  const rand = rng(seed);
  const s = r.sense;
  const sentence = s.examples[0];
  const at = locate(r, sentence);
  const base = { id: `${kind}:${s.id}`, kind, senseId: s.id, lemma: r.item.lemma, level: s.level, definition: s.definition, ru: s.translations.ru, collocations: s.collocations.slice(0, 4), example: s.examples[1] ?? (s.collocations.length ? `Common combinations: ${s.collocations.slice(0, 3).join(", ")}.` : sentence) };
  if (kind === "produce") return { ...base, sentence: "", answer: r.item.lemma, accepted: [], fit: `Use “${r.item.lemma}” with its meaning “${s.definition}”.`, hint: s.collocations[0] };
  if (!at) return null;
  const answer = at.text;
  const fit = fitFor(r, sentence);
  if (kind === "gap") {
    return { ...base, sentence: blank(sentence, at), answer, accepted: [answer.toLowerCase()], hint: `${answer[0]}${"_".repeat(Math.max(0, answer.replace(/\s/g, "").length - 1))} (${answer.replace(/\s/g, "").length} letters) — ${s.definition}`, fit };
  }
  if (kind === "form") {
    if (answer.toLowerCase() === r.item.lemma.toLowerCase()) return null; // only when the sentence needs an inflected form
    return { ...base, sentence: blank(sentence, at), answer, accepted: [answer.toLowerCase()], hint: r.item.lemma, fit: `${fit} The sentence needs the form “${answer}”, not the base form “${r.item.lemma}”.` };
  }
  if (kind === "choice") {
    if (answer.toLowerCase() !== r.item.lemma.toLowerCase()) return null; // options are base forms, so the gap must be one too
    const theme = s.topics[0];
    const others = allSenses().filter((x) => !x.sense.topics.includes(theme));
    const ds = distractors(r, others, rand, sentence);
    if (ds.length < 3) return null;
    const options: ContextOption[] = [{ text: r.item.lemma, correct: true, why: fit }, ...ds.map((d) => ({ text: d.item.lemma, correct: false, why: `“${d.item.lemma}” means “${d.sense.definition}”, which does not fit this sentence.` }))];
    return { ...base, sentence: blank(sentence, at), answer, accepted: [answer.toLowerCase()], options: options.map((o) => ({ o, k: rand() })).sort((a, b) => a.k - b.k).map((x) => x.o), fit };
  }
  // meaning
  const ds = distractors(r, pool, rand, null);
  if (ds.length < 3) return null;
  const options: ContextOption[] = [
    { text: s.definition, correct: true, why: `In this sentence “${answer}” means “${s.definition}” (${s.translations.ru}).` },
    ...ds.map((d) => ({ text: d.sense.definition, correct: false, why: `This is the meaning of “${d.item.lemma}”, not of “${answer}”.` })),
  ];
  return { ...base, sentence: highlight(sentence, at), answer, accepted: [], options: options.map((o) => ({ o, k: rand() })).sort((a, b) => a.k - b.k).map((x) => x.o), fit };
}

/**
 * A round of exercises for one theme. Items the learner has already met (saved or reviewed) come
 * first, so the practice turns recognised words into usable ones; formats rotate, and every round
 * ends with one production task.
 */
export function buildContextRound(theme: string, studied: string[], seed: number, size = 10, level?: string): ContextItem[] {
  const pool = allSenses().filter((r) => r.sense.topics.includes(theme));
  const rand = rng(seed);
  const known = new Set(studied);
  // With a target level, senses at that level come first, then the neighbouring levels; studied words still lead within each band.
  const L = ["B2", "B2+", "C1", "C2"];
  const dist = (l: string) => (level ? Math.abs(L.indexOf(l) - L.indexOf(level)) * 2 : 0);
  const order = pool.map((r) => ({ r, k: dist(r.sense.level) + (known.has(r.sense.id) ? 0 : 1) + rand() })).sort((a, b) => a.k - b.k).map((o) => o.r);
  const kinds: ContextKind[] = ["choice", "gap", "meaning", "form"];
  const out: ContextItem[] = [];
  const used = new Set<string>();
  let k = Math.floor(rand() * kinds.length);
  for (const r of order) {
    if (out.length >= size - 1) break;
    if (used.has(r.item.lemma)) continue;
    // try the next format in rotation, then the others
    for (let t = 0; t < kinds.length; t++) {
      const kind = kinds[(k + t) % kinds.length];
      const item = contextItem(r, kind, pool, seed + out.length * 97);
      if (item) { out.push(item); used.add(r.item.lemma); k = (k + t + 1) % kinds.length; break; }
    }
  }
  const prodSource = order.find((r) => known.has(r.sense.id) && !used.has(r.item.lemma)) ?? order.find((r) => !used.has(r.item.lemma));
  if (prodSource) out.push(contextItem(prodSource, "produce", pool, seed)!);
  return out;
}

export const normalise = (s: string) => s.trim().toLowerCase().replace(/[’']/g, "'").replace(/[.!?,;:]+$/, "").replace(/\s+/g, " ");
/** Does a learner's own sentence use the item (any regular form)? */
export function usesItem(r: SenseRef, sentence: string) { return !!locate(r, sentence); }
export { cap };

/** B2→C2 progression: per-level accuracy from the learner's saved context-practice answers. */
export const VOCAB_LEVELS = ["B2", "B2+", "C1", "C2"] as const;
export function levelStats(responses: { targetRef: string | null; correct: boolean; errorTag: string | null; questionId: string }[], senseLevel: (id: string) => string | undefined) {
  const out = Object.fromEntries(VOCAB_LEVELS.map((l) => [l, { answered: 0, correct: 0 }])) as Record<string, { answered: number; correct: number }>;
  for (const r of responses) {
    if (!r.targetRef || !/^(choice|gap|meaning|form):/.test(r.questionId)) continue;
    const l = senseLevel(r.targetRef); if (!l || !out[l]) continue;
    out[l].answered++; if (r.correct) out[l].correct++;
  }
  return out;
}
/** Start at B2; move up a level after at least 8 answers at the current level with 80% or more correct. */
export function suggestedLevel(stats: Record<string, { answered: number; correct: number }>): string {
  for (const l of VOCAB_LEVELS) { const s = stats[l]; if (!(s.answered >= 8 && s.correct / s.answered >= 0.8)) return l; }
  return "C2";
}
