import type { ActivityEvent } from "./store/types";
import { dayKey, studyDays, computeStreak } from "./progress";

/**
 * Streak and daily goal, computed only from the learner's saved activity events (so they persist
 * between sessions and devices). A day counts when at least one learning activity was recorded.
 * The streak stays alive until the end of today: if you studied yesterday but not yet today, it
 * is "at risk", not lost.
 */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
export type FlameTier = "ember" | "flame" | "bright" | "blaze" | "radiant";
export const DEFAULT_DAILY_GOAL = 3;
export const DAILY_GOAL_OPTIONS = [1, 2, 3, 5, 8] as const;

/**
 * Activities for the daily goal: each completed exercise, reading text, review session, essay,
 * speaking answer or listening log counts once; a lesson counts once per day however many of its
 * sections were opened.
 */
const GOAL_EVENTS = new Set(["lesson_section_viewed", "exercise_completed", "review_completed", "reading_completed", "writing_submitted", "speaking_submitted", "listening_logged"]);
export function activitiesOn(events: ActivityEvent[], day: string, tz?: string) {
  const seen = new Set<string>();
  let n = 0;
  for (const e of events) {
    if (!GOAL_EVENTS.has(e.type) || dayKey(e.createdAt, tz) !== day) continue;
    if (e.type === "lesson_section_viewed" || e.type === "review_completed") {
      const k = e.type === "review_completed" ? "review" : `lesson:${(e.contentRef ?? "").split("#")[0]}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    n++;
  }
  return n;
}

export function longestStreak(events: ActivityEvent[], tz?: string) {
  const days = [...studyDays(events, tz)].sort();
  let best = 0, run = 0, prev: number | null = null;
  for (const d of days) {
    const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5;
    run = prev !== null && t - prev === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export function tierFor(streak: number): FlameTier {
  return streak >= 100 ? "radiant" : streak >= 30 ? "blaze" : streak >= 7 ? "bright" : streak >= 1 ? "flame" : "ember";
}

export interface StreakState {
  streak: number;
  best: number;
  studiedToday: boolean;
  atRisk: boolean;
  today: number;
  goal: number;
  goalMet: boolean;
  tier: FlameTier;
  milestone: number | null; // highest milestone reached by the current streak
  next: number | null;      // next milestone to reach
  week: { day: string; label: string; studied: boolean; isToday: boolean }[];
}

export function streakState(events: ActivityEvent[], goal = DEFAULT_DAILY_GOAL, now = new Date(), tz?: string): StreakState {
  const streak = computeStreak(events, now, tz);
  const days = studyDays(events, tz);
  const todayKey = dayKey(now, tz);
  const studiedToday = days.has(todayKey);
  const today = activitiesOn(events, todayKey, tz);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d, tz);
    return { day: key, label: new Intl.DateTimeFormat("en-GB", { weekday: "narrow", timeZone: tz }).format(d), studied: days.has(key), isToday: key === todayKey };
  });
  return {
    streak, best: Math.max(longestStreak(events, tz), streak), studiedToday, atRisk: streak > 0 && !studiedToday,
    today, goal, goalMet: today >= goal, tier: tierFor(streak),
    milestone: [...MILESTONES].reverse().find((m) => streak >= m) ?? null,
    next: MILESTONES.find((m) => streak < m) ?? null,
    week,
  };
}
