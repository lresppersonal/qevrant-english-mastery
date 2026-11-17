import type { ActivityEvent } from "./store/types";
import { dayKey, studyDays, computeStreak, LESSON_SECTIONS_FOR_STUDY } from "./progress";

/**
 * Streak and daily goal, computed only from the learner's saved activity events (so they persist
 * between sessions and devices). A day counts when at least one learning activity was recorded.
 * The streak stays alive until the end of today: if you studied yesterday but not yet today, it
 * is "at risk", not lost.
 */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
export type FlameTier = "ember" | "spark" | "warm" | "bright" | "vivid" | "deep" | "radiant";
export const DEFAULT_DAILY_GOAL = 3;
export const DAILY_GOAL_OPTIONS = [1, 2, 3, 5, 8] as const;

/**
 * Activities for the daily goal: each completed exercise, reading text, essay, speaking answer or
 * listening log counts once; review counts once a day; a lesson counts once it has actually been
 * studied (three or more sections read that day). Simply opening a page never counts.
 */
const COMPLETED = new Set(["exercise_completed", "reading_completed", "writing_submitted", "speaking_submitted", "listening_logged"]);
export function activitiesOn(events: ActivityEvent[], day: string, tz?: string) {
  let n = 0, reviewed = false;
  const lessons = new Map<string, Set<string>>();
  for (const e of events) {
    if (dayKey(e.createdAt, tz) !== day) continue;
    if (COMPLETED.has(e.type)) n++;
    else if (e.type === "review_completed") reviewed = true;
    else if (e.type === "lesson_section_viewed" && e.contentRef) {
      const [lesson, section] = e.contentRef.split("#");
      lessons.set(lesson, (lessons.get(lesson) ?? new Set()).add(section ?? ""));
    }
  }
  for (const set of lessons.values()) if (set.size >= LESSON_SECTIONS_FOR_STUDY) n++;
  return n + (reviewed ? 1 : 0);
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

/** Gradual colour progression with consistency: 1–2 days spark, 3–6 warm, 7–13 bright, 14–29 vivid, 30–99 deep, 100+ radiant. */
export function tierFor(streak: number): FlameTier {
  return streak >= 100 ? "radiant" : streak >= 30 ? "deep" : streak >= 14 ? "vivid" : streak >= 7 ? "bright" : streak >= 3 ? "warm" : streak >= 1 ? "spark" : "ember";
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
