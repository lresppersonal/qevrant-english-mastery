import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";
import type { ActivityEvent, ResponseRow, ReviewCardRow, SavedItem, SavedStatus } from "./store/types";

/**
 * Every dashboard number is derived here from raw rows (events, responses, review cards).
 * Nothing is stored as a free-standing counter, so numbers can always be recomputed and audited.
 */

/** Local calendar day (YYYY-MM-DD) in the given IANA time zone. */
export function dayKey(iso: string | Date, timeZone?: string) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/**
 * A study day needs COMPLETED learning, not just opening the app: a finished exercise, review session,
 * reading text, essay, speaking answer or listening log — or a lesson actually studied (at least
 * three of its sections read that day, or all of them for shorter lessons).
 */
const COMPLETION_EVENTS = new Set(["exercise_completed", "review_completed", "reading_completed", "writing_submitted", "speaking_submitted", "listening_logged"]);
export const LESSON_SECTIONS_FOR_STUDY = 3;

export function studyDays(events: ActivityEvent[], tz?: string) {
  const days = new Set<string>();
  const sections = new Map<string, Set<string>>(); // day|lesson -> sections
  for (const e of events) {
    if (COMPLETION_EVENTS.has(e.type)) days.add(dayKey(e.createdAt, tz));
    else if (e.type === "lesson_section_viewed" && e.contentRef) {
      const [lesson, section] = e.contentRef.split("#");
      const k = `${dayKey(e.createdAt, tz)}|${lesson}`;
      const set = sections.get(k) ?? new Set<string>();
      set.add(section ?? "");
      sections.set(k, set);
    }
  }
  for (const [k, set] of sections) if (set.size >= LESSON_SECTIONS_FOR_STUDY) days.add(k.split("|")[0]);
  return days;
}

/** Consecutive study days ending today (or yesterday, if today has no activity yet). */
export function computeStreak(events: ActivityEvent[], now = new Date(), tz?: string) {
  const days = studyDays(events, tz);
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor, tz))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor, tz))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Study days in the current Monday-to-Sunday week. */
export function daysThisWeek(events: ActivityEvent[], now = new Date(), tz?: string) {
  const days = studyDays(events, tz);
  const start = new Date(now);
  const dow = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - dow);
  let count = 0;
  for (let i = 0; i <= dow; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (days.has(dayKey(d, tz))) count++;
  }
  return count;
}

export type MasteryBand = "not_started" | "practising" | "secure" | "mastered";

/**
 * Mastery of a target (lesson slug or sense id) from the learner's most recent answers.
 * Uses the last 10 answers; needs at least 4 to be "secure" (≥80%) and 8 to be "mastered" (≥90%).
 */
export function mastery(responses: ResponseRow[], targetRef: string) {
  const rows = responses.filter((r) => r.targetRef === targetRef).slice(-10);
  if (!rows.length) return { band: "not_started" as MasteryBand, accuracy: 0, answered: 0 };
  const accuracy = rows.filter((r) => r.correct).length / rows.length;
  const band: MasteryBand = rows.length >= 8 && accuracy >= 0.9 ? "mastered" : rows.length >= 4 && accuracy >= 0.8 ? "secure" : "practising";
  return { band, accuracy, answered: rows.length };
}

// ---------- Spaced revision (FSRS) ----------
const scheduler = fsrs({ enable_fuzz: false });

export function toCard(row: ReviewCardRow): Card {
  return {
    due: new Date(row.due), stability: row.stability, difficulty: row.difficulty, elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays, learning_steps: row.learningSteps, reps: row.reps, lapses: row.lapses,
    state: row.state, last_review: row.lastReview ? new Date(row.lastReview) : undefined,
  } as Card;
}
export function fromCard(savedItemId: string, c: Card): ReviewCardRow {
  return {
    savedItemId, due: c.due.toISOString(), stability: c.stability, difficulty: c.difficulty, elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days, learningSteps: c.learning_steps, reps: c.reps, lapses: c.lapses, state: c.state,
    lastReview: c.last_review ? c.last_review.toISOString() : null,
  };
}
export function newCard(savedItemId: string, now = new Date()) {
  return fromCard(savedItemId, createEmptyCard(now));
}

export const RATINGS = [
  { grade: Rating.Again as Grade, label: "Again", hint: "I didn't remember" },
  { grade: Rating.Hard as Grade, label: "Hard", hint: "Remembered with effort" },
  { grade: Rating.Good as Grade, label: "Good", hint: "Remembered" },
  { grade: Rating.Easy as Grade, label: "Easy", hint: "Instant" },
];

export function rate(row: ReviewCardRow, grade: Grade, now = new Date()) {
  const { card } = scheduler.next(toCard(row), now, grade);
  return fromCard(row.savedItemId, card);
}

/** Preview of the next interval for each rating, for button labels. */
export function previewIntervals(row: ReviewCardRow, now = new Date()) {
  const preview = scheduler.repeat(toCard(row), now);
  return RATINGS.map((r) => ({ ...r, due: preview[r.grade].card.due }));
}

/** Saved items whose review card is due (items without a card are due immediately). */
export function dueItems(saved: SavedItem[], cards: ReviewCardRow[], now = new Date()) {
  const byId = new Map(cards.map((c) => [c.savedItemId, c]));
  return saved.filter((s) => {
    const c = byId.get(s.id);
    return !c || new Date(c.due) <= now;
  });
}

/** Status shown in Personal Vocabulary, derived from the FSRS card. */
export function statusFromCard(c: ReviewCardRow | undefined): SavedStatus {
  if (!c || c.reps === 0) return "new";
  if (c.state === 1 || c.state === 3) return "learning"; // Learning / Relearning
  if (c.stability >= 21) return "mastered";
  return "familiar";
}

export function humanInterval(due: Date, now = new Date()) {
  const mins = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} d`;
  return `${Math.round(days / 30)} mo`;
}
