import type { ActivityEvent, Attempt, ListeningLog, SpeakingAttempt } from "@/lib/store/types";
import { SKILLS, type Skill } from "@/lib/plan/personal";
import { skillOfEvent } from "@/lib/weekly";

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Active study minutes per local day, from measured time only: timed exercises (start → finish, capped at
 * 30 minutes so an exercise left open does not count), logged listening and recorded speaking.
 * Reading and writing are not timed yet, so they are not counted rather than estimated.
 */
export function activeMinutesByDay(input: { attempts: Pick<Attempt, "startedAt" | "completedAt">[]; listening: Pick<ListeningLog, "minutes" | "createdAt">[]; speaking: Pick<SpeakingAttempt, "durationSeconds" | "createdAt">[] }): Map<string, number> {
  const m = new Map<string, number>();
  const add = (iso: string, min: number) => { if (!(min > 0)) return; const k = key(new Date(iso)); m.set(k, (m.get(k) ?? 0) + min); };
  for (const a of input.attempts) add(a.completedAt, Math.min(30, (Date.parse(a.completedAt) - Date.parse(a.startedAt)) / 60000));
  for (const l of input.listening) add(l.createdAt, Math.min(180, l.minutes));
  for (const s of input.speaking) add(s.createdAt, Math.min(10, s.durationSeconds / 60));
  for (const [k, v] of m) m.set(k, Math.round(v));
  return m;
}

/** Heatmap buckets: 0, 1–14, 15–29, 30–44, 45–59, 60+ minutes. */
export const HEAT_BUCKETS = [0, 1, 15, 30, 45, 60] as const;
export const heatLevel = (min: number) => (min >= 60 ? 5 : min >= 45 ? 4 : min >= 30 ? 3 : min >= 15 ? 2 : min >= 1 ? 1 : 0);
export const HEAT_LABEL = ["No study", "1–14 min", "15–29 min", "30–44 min", "45–59 min", "60+ min"];

/** Monday-first calendar for one month: weeks × 7, null outside the month. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** Completed tasks per area, all time (Grammar includes practice; Academic Writing separate). */
export function completedBySkill(events: Pick<ActivityEvent, "type" | "contentType">[]): Record<Skill, number> {
  const out = Object.fromEntries(SKILLS.map((s) => [s, 0])) as Record<Skill, number>;
  for (const e of events) { const s = skillOfEvent(e); if (s) out[s]++; }
  return out;
}

export const dayKeyLocal = key;
