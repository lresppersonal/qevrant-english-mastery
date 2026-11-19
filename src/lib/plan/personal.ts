import { getExercise } from "../content";
import type { Attempt, ListeningLog, Profile, ResponseRow, ReviewLogRow, SpeakingAttempt, WritingSubmission } from "../store/types";

/**
 * Personalised priorities for the Intensive Study Plan.
 *
 * Everything here is a transparent rule, recalculated every time the plan is shown, from three inputs:
 *   1. the learner's self-assessment (confidence 1–5 per skill, plus the areas they most want to improve);
 *   2. their real results, once there is enough evidence (accuracy, review ratings, listening comprehension,
 *      estimated bands from writing and speaking feedback) — recent results gradually take over from the self-rating;
 *   3. any manual priority the learner sets, which always wins.
 * No AI is involved. The universal programme is never changed: priorities only adjust how each day's blocks are
 * weighted, and add a few integrated "focus" blocks for the highest-priority skills.
 */
export const SKILLS = ["grammar", "vocabulary", "reading", "listening", "speaking", "writing"] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LABEL: Record<Skill, string> = { grammar: "Grammar", vocabulary: "Vocabulary", reading: "Reading", listening: "Listening", speaking: "Speaking", writing: "Academic Writing" };
export type Priority = "high" | "medium" | "maintenance";
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High priority", medium: "Medium priority", maintenance: "Maintenance" };
export const CONFIDENCE_LABEL = ["", "I struggle considerably", "I have noticeable difficulties", "Intermediate confidence", "Relatively comfortable", "Very confident"] as const;

export interface Assessment { ratings: Partial<Record<Skill, number>>; focus: Skill[]; updatedAt: string }
export type Overrides = Partial<Record<Skill, Priority>>;

export function readAssessment(p: Profile | null): Assessment | null {
  const raw = (p?.preferences as { assessment?: Partial<Assessment> } | undefined)?.assessment;
  if (!raw || typeof raw !== "object" || !raw.ratings) return null;
  const ratings: Partial<Record<Skill, number>> = {};
  for (const s of SKILLS) { const v = Number((raw.ratings as Record<string, unknown>)[s]); if (v >= 1 && v <= 5) ratings[s] = Math.round(v); }
  const focus = (Array.isArray(raw.focus) ? raw.focus : []).filter((s): s is Skill => (SKILLS as readonly string[]).includes(s as string)).slice(0, 3);
  return { ratings, focus, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "" };
}
export function readOverrides(p: Profile | null): Overrides {
  const raw = (p?.preferences as { priorities?: Record<string, string> } | undefined)?.priorities ?? {};
  const out: Overrides = {};
  for (const s of SKILLS) if (raw[s] === "high" || raw[s] === "medium" || raw[s] === "maintenance") out[s] = raw[s] as Priority;
  return out;
}

export interface Evidence {
  responses: ResponseRow[]; attempts: Attempt[]; reviewLogs: ReviewLogRow[]; listening: ListeningLog[];
  writing: WritingSubmission[]; speaking: SpeakingAttempt[];
}
export interface SkillPriority { skill: Skill; priority: Priority; need: number; source: "self" | "results" | "both" | "manual" | "default"; reasons: string[] }

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const RECENT_DAYS = 30;

/** Need (0 = strong, 1 = needs the most work) from recent results, when there is enough evidence. */
export function performanceNeed(skill: Skill, e: Evidence, now = Date.now()): { need: number; reason: string } | null {
  const since = new Date(now - RECENT_DAYS * 864e5).toISOString();
  const skillOf = new Map(e.attempts.map((a) => [a.id, a.exerciseSlug.startsWith("smart-") ? "grammar" : getExercise(a.exerciseSlug)?.skill]));
  const answers = (k: string) => e.responses.filter((r) => r.createdAt >= since && skillOf.get(r.attemptId) === k);
  const band = (xs: { createdAt: string; feedback: unknown }[]) => xs.filter((x) => x.createdAt >= since).map((x) => (x.feedback as { estimate?: { mean?: number } } | null)?.estimate?.mean).filter((m): m is number => typeof m === "number");
  if (skill === "grammar" || skill === "reading") {
    const rs = answers(skill);
    if (rs.length < (skill === "grammar" ? 15 : 8)) return null;
    const acc = rs.filter((r) => r.correct).length / rs.length;
    return { need: clamp((0.9 - acc) / 0.35), reason: `Your recent ${skill} accuracy is ${pct(acc)} (${rs.length} answers in the last ${RECENT_DAYS} days).` };
  }
  if (skill === "vocabulary") {
    const ls = e.reviewLogs.filter((l) => l.reviewedAt >= since);
    if (ls.length < 15) return null;
    const hard = ls.filter((l) => l.rating <= 2).length / ls.length;
    return { need: clamp(hard / 0.5), reason: `In ${ls.length} recent flashcard reviews, ${pct(hard)} were rated Again or Difficult.` };
  }
  if (skill === "listening") {
    const ls = e.listening.filter((l) => l.createdAt >= since);
    if (ls.length < 2) return null;
    const avg = ls.reduce((n, l) => n + l.comprehension, 0) / ls.length;
    return { need: clamp((4.5 - avg) / 2.5), reason: `Your comprehension ratings in ${ls.length} recent listening sessions average ${avg.toFixed(1)} out of 5.` };
  }
  const bands = band(skill === "speaking" ? e.speaking : e.writing);
  if (bands.length < 2) return null;
  const mean = bands.reduce((n, b) => n + b, 0) / bands.length;
  return { need: clamp((7.5 - mean) / 2.5), reason: `Your recent ${skill === "speaking" ? "speaking answers" : "essays"} have an average estimated band of about ${mean.toFixed(1)} (${bands.length} assessed; an educational estimate, not an official score).` };
}

export function computePriorities(a: Assessment | null, e: Evidence, overrides: Overrides = {}, now = Date.now()): SkillPriority[] {
  const rows = SKILLS.map((skill): SkillPriority => {
    const reasons: string[] = [];
    const rating = a?.ratings[skill];
    const self = rating ? (5 - rating) / 4 : null;
    if (rating) reasons.push(`You rated your confidence ${rating} out of 5: “${CONFIDENCE_LABEL[rating]}”.`);
    const perf = performanceNeed(skill, e, now);
    if (perf) reasons.push(perf.reason);
    let need = self !== null && perf ? 0.4 * self + 0.6 * perf.need : perf ? perf.need : self !== null ? self : 0.45;
    if (a?.focus.includes(skill)) { need = clamp(need + 0.2); reasons.push("You chose it as one of the areas you most want to improve."); }
    const source = self !== null && perf ? "both" : perf ? "results" : self !== null ? "self" : "default";
    if (source === "default") reasons.push("No self-assessment or results yet, so it keeps the standard weighting.");
    return { skill, need, priority: need >= 0.6 ? "high" : need >= 0.35 ? "medium" : "maintenance", source, reasons };
  });
  // At most two automatic high priorities, so the plan stays balanced; the rest become medium.
  const highs = rows.filter((r) => r.priority === "high").sort((x, y) => y.need - x.need);
  for (const r of highs.slice(2)) { r.priority = "medium"; r.reasons.push("Three or more areas came out as high priority; only the two with the greatest need are weighted up, to keep the plan balanced."); }
  for (const r of rows) {
    const o = overrides[r.skill];
    if (o && o !== r.priority) { r.reasons.push(`You set this to ${PRIORITY_LABEL[o].toLowerCase()} yourself (the calculation suggested ${PRIORITY_LABEL[r.priority].toLowerCase()}).`); r.priority = o; r.source = "manual"; }
    else if (o) r.source = "manual";
  }
  // Results that have improved: say so when the self-rating alone would have made it higher.
  for (const r of rows) {
    const rating = a?.ratings[r.skill];
    const perf = performanceNeed(r.skill, e, now);
    if (rating && perf && rating <= 2 && perf.need < 0.35 && r.source !== "manual") r.reasons.push("Your results are now strong, so its priority has been reduced; it still appears regularly for revision.");
  }
  return rows;
}

export const priorityOf = (ps: SkillPriority[] | null | undefined, s: Skill): Priority => ps?.find((p) => p.skill === s)?.priority ?? "medium";
