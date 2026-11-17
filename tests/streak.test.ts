import { describe, it, expect } from "vitest";
import { streakState, longestStreak, activitiesOn, tierFor } from "@/lib/streak";
import { computeStreak } from "@/lib/progress";
import type { ActivityEvent } from "@/lib/store/types";

const ev = (iso: string, type = "exercise_completed", contentRef: string | null = null): ActivityEvent => ({ id: iso + type + contentRef, type, contentType: null, contentRef, payload: {}, createdAt: iso } as ActivityEvent);
const at = (d: string, h = 12) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00`).toISOString();

describe("streak", () => {
  const now = new Date(`2026-03-02T10:00:00`);
  it("counts consecutive days across a month boundary", () => {
    const e = [at("2026-02-27"), at("2026-02-28"), at("2026-03-01"), at("2026-03-02")].map((d) => ev(d));
    expect(computeStreak(e, now)).toBe(4);
  });
  it("keeps yesterday's streak alive (at risk) until today ends", () => {
    const s = streakState([ev(at("2026-02-28")), ev(at("2026-03-01"))], 3, now);
    expect(s).toMatchObject({ streak: 2, studiedToday: false, atRisk: true });
  });
  it("resets after a missed day", () => {
    expect(computeStreak([ev(at("2026-02-27")), ev(at("2026-03-02"))], now)).toBe(1);
    expect(computeStreak([ev(at("2026-02-27"))], now)).toBe(0);
  });
  it("ignores non-study events such as saving a word", () => {
    expect(computeStreak([ev(at("2026-03-02"), "item_saved")], now)).toBe(0);
  });
  it("finds the longest streak ever", () => {
    const days = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-10", "2026-01-11"];
    expect(longestStreak(days.map((d) => ev(at(d))))).toBe(3);
  });
  it("counts daily-goal activities, a lesson once however many sections were opened", () => {
    const d = "2026-03-02";
    const e = [ev(at(d, 9), "lesson_section_viewed", "articles#a"), ev(at(d, 9), "lesson_section_viewed", "articles#b"), ev(at(d, 10), "exercise_completed"), ev(at(d, 11), "review_completed"), ev(at(d, 11), "review_completed")];
    expect(activitiesOn(e, d)).toBe(3);
    expect(streakState(e, 3, now).goalMet).toBe(true);
  });
  it("assigns milestone tiers", () => {
    expect([0, 1, 7, 30, 100].map(tierFor)).toEqual(["ember", "flame", "bright", "blaze", "radiant"]);
    const e = Array.from({ length: 8 }, (_, i) => ev(new Date(now.getTime() - i * 864e5).toISOString()));
    expect(streakState(e, 3, now)).toMatchObject({ streak: 8, milestone: 7, next: 14, tier: "bright" });
  });
});
