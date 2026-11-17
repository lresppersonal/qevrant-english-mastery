import { describe, it, expect } from "vitest";
import { Rating } from "ts-fsrs";
import { computeStreak, daysThisWeek, mastery, newCard, rate, dueItems, statusFromCard } from "@/lib/progress";
import { isCorrect, normalise } from "@/lib/answers";
import { speechMetrics, countWords } from "@/lib/ai/schemas";
import { sanitiseRefs } from "@/lib/ai/server";
import { getExercise } from "@/lib/content";
import type { ActivityEvent, ResponseRow, SavedItem } from "@/lib/store/types";

const ev = (iso: string, type: ActivityEvent["type"] = "exercise_completed"): ActivityEvent => ({ id: iso, type, contentType: null, contentRef: null, payload: {}, createdAt: iso });
const TZ = "UTC";

describe("streaks and weekly goal are computed from events", () => {
  const now = new Date("2026-11-18T12:00:00Z"); // Wednesday
  it("counts consecutive days ending today", () => {
    expect(computeStreak([ev("2026-11-16T09:00:00Z"), ev("2026-11-17T09:00:00Z"), ev("2026-11-18T09:00:00Z")], now, TZ)).toBe(3);
  });
  it("still counts a streak that ended yesterday", () => {
    expect(computeStreak([ev("2026-11-16T09:00:00Z"), ev("2026-11-17T09:00:00Z")], now, TZ)).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(computeStreak([ev("2026-11-15T09:00:00Z"), ev("2026-11-17T09:00:00Z")], now, TZ)).toBe(1);
  });
  it("ignores non-study events such as saving a word", () => {
    expect(computeStreak([ev("2026-11-18T09:00:00Z", "item_saved")], now, TZ)).toBe(0);
  });
  it("counts study days since Monday", () => {
    expect(daysThisWeek([ev("2026-11-15T09:00:00Z"), ev("2026-11-16T09:00:00Z"), ev("2026-11-18T08:00:00Z"), ev("2026-11-18T10:00:00Z")], now, TZ)).toBe(2);
  });
});

describe("mastery", () => {
  const r = (correct: boolean): ResponseRow => ({ attemptId: "a", questionId: "q", targetRef: "relative-clauses", response: 0, correct, errorTag: null, createdAt: "" });
  it("is not_started without answers", () => expect(mastery([], "relative-clauses").band).toBe("not_started"));
  it("needs enough evidence before calling something secure", () => {
    expect(mastery([r(true), r(true), r(true)], "relative-clauses").band).toBe("practising");
    expect(mastery([r(true), r(true), r(true), r(true)], "relative-clauses").band).toBe("secure");
  });
  it("reaches mastered at 8+ answers with 90%+", () => {
    expect(mastery(Array.from({ length: 9 }, () => r(true)), "relative-clauses").band).toBe("mastered");
  });
});

describe("FSRS revision", () => {
  const t0 = new Date("2026-11-16T10:00:00Z");
  it("schedules Easy later than Good, and Good later than Again", () => {
    const c = newCard("x", t0);
    const again = new Date(rate(c, Rating.Again, t0).due).getTime();
    const good = new Date(rate(c, Rating.Good, t0).due).getTime();
    const easy = new Date(rate(c, Rating.Easy, t0).due).getTime();
    expect(again).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });
  it("treats saved items without a card as due, and reviewed ones as not due", () => {
    const saved: SavedItem[] = [{ id: "a", itemType: "sense", itemRef: "setback-n", label: "setback", context: null, sourceRef: null, status: "new", createdAt: "" }];
    expect(dueItems(saved, [], t0)).toHaveLength(1);
    const card = rate(newCard("a", t0), Rating.Easy, t0);
    expect(dueItems(saved, [card], t0)).toHaveLength(0);
    expect(statusFromCard(card)).not.toBe("new");
  });
});

describe("answer checking", () => {
  it("normalises case, spaces, apostrophes and final punctuation", () => {
    expect(normalise("  Worries   ME. ")).toBe("worries me");
    expect(normalise("don’t")).toBe("don't");
  });
  it("accepts typed answers case-insensitively", () => {
    const q = getExercise("relative-clauses-practice")!.questions.find((x) => x.id === "q3")!;
    expect(isCorrect(q, "Which")).toBe(true);
    expect(isCorrect(q, "that")).toBe(false);
  });
});

describe("AI helpers", () => {
  it("computes delivery metrics from the transcript", () => {
    const m = speechMetrics("um I think that er education is important. You know it matters.", 30);
    expect(m.words).toBe(12);
    expect(m.wordsPerMinute).toBe(24);
    expect(m.fillers).toBe(3);
    expect(countWords(" a  b\nc ")).toBe(3);
  });
  it("drops invented quotes and unknown grammar or vocabulary references", () => {
    const fb = sanitiseRefs({
      issues: [
        { quote: "students which fail", grammarRef: "lesson:relative-clauses#form" },
        { quote: "not in the text", grammarRef: "lesson:relative-clauses#form" },
        { quote: "the reason", grammarRef: "lesson:made-up#x" },
      ],
      vocabularyUpgrades: [{ senseRef: "setback-n" }, { senseRef: "nonsense" }],
    }, "Some students which fail. That is the reason.");
    expect(fb.issues).toHaveLength(2);
    expect(fb.issues[0].grammarRef).toBe("lesson:relative-clauses#form");
    expect(fb.issues[1].grammarRef).toBeNull();
    expect(fb.vocabularyUpgrades.map((u) => u.senseRef)).toEqual(["setback-n", null]);
  });
});

import { Countdown, fmtClock } from "../src/lib/countdown";
import { pickPrompt, matchingPrompts, SPEAKING_MODES } from "../src/lib/speaking-bank";
import { bandEstimate, repetitionStats } from "../src/lib/ai/schemas";

describe("countdown", () => {
  it("counts down by wall clock and excludes paused time", () => {
    const c = new Countdown(60_000, 0);
    expect(c.remainingMs(10_000)).toBe(50_000);
    c.pause(10_000);
    expect(c.remainingMs(40_000)).toBe(50_000);
    c.resume(40_000);
    expect(c.remainingMs(45_000)).toBe(45_000);
    expect(c.elapsedMs(45_000)).toBe(15_000);
    expect(c.done(100_000)).toBe(true);
    expect(fmtClock(60_000)).toBe("1:00");
    expect(fmtClock(14_200)).toBe("0:15");
  });
});

describe("speaking bank", () => {
  it("modes have fixed timings", () => {
    expect(SPEAKING_MODES.one).toMatchObject({ prepSeconds: 15, speakSeconds: 60 });
    expect(SPEAKING_MODES.two).toMatchObject({ prepSeconds: 60, speakSeconds: 120 });
  });
  it("respects level and category filters", () => {
    for (let i = 0; i < 50; i++) {
      const p = pickPrompt("C1", "environment", [])!;
      expect(p.level).toBe("C1");
      expect(p.category).toBe("environment");
    }
  });
  it("avoids recently shown prompts until the pool is exhausted", () => {
    const pool = matchingPrompts("B2", "all");
    const recent: string[] = [];
    for (let i = 0; i < pool.length; i++) { const p = pickPrompt("B2", "all", recent)!; expect(recent).not.toContain(p.id); recent.push(p.id); }
    expect(pickPrompt("B2", "all", recent)!.id).toBe(recent[0]);
  });
  it("has at least 150 prompts covering every level", () => {
    expect(matchingPrompts("all", "all").length).toBeGreaterThanOrEqual(150);
    for (const l of ["B2", "B2+", "C1", "C2"] as const) expect(matchingPrompts(l, "all").length).toBeGreaterThan(10);
  });
});

describe("feedback helpers", () => {
  it("turns criterion bands into a transparent range", () => {
    expect(bandEstimate([{ band: 6 }, { band: 6.5 }, { band: 6 }, { band: 6.5 }])).toMatchObject({ mean: 6.5, low: 6, high: 6.5 });
    expect(bandEstimate([])).toBeNull();
  });
  it("finds repeated words and phrases", () => {
    const r = repetitionStats("It is very important. Education is very important and education matters. Education again.");
    expect(r.find((x) => x.word === "very important")?.count).toBe(2);
    expect(r.find((x) => x.word === "education")?.count).toBe(3);
  });
});

import { weeklyReport, sectionProgress, mondayOf } from "../src/lib/analytics";

describe("weekly report", () => {
  const info = { lessons: [{ slug: "l1", title: "Lesson one", sections: [{ id: "form", title: "Form" }] }], readingSlugs: ["t1"], exerciseSkill: (s: string) => (s.startsWith("g") ? "grammar" : "reading") };
  const now = new Date("2026-11-18T12:00:00Z");
  const iso = "2026-11-17T10:00:00Z";
  const base = { events: [], responses: [], attempts: [], reviewLogs: [], saved: [], writing: [], speaking: [], listening: [], weeklyGoalDays: 4 };

  it("marks sections without enough evidence as insufficiently assessed", () => {
    const r = weeklyReport(base, info, now, now);
    expect(r.overall).toBeNull();
    expect(r.insufficient).toEqual(expect.arrayContaining(["grammar", "vocabulary", "reading", "listening", "speaking", "writing"]));
  });

  it("scores grammar accuracy, recurring mistakes and consistency from real rows", () => {
    const attempts = [{ id: "a1", exerciseSlug: "g-ex", exerciseVersion: 1, score: 8, total: 12, startedAt: iso, completedAt: iso }];
    const responses = Array.from({ length: 12 }, (_, i) => ({ attemptId: "a1", questionId: `q${i}`, targetRef: "l1", response: null, correct: i < 9, errorTag: i < 9 ? null : "l1:form", createdAt: iso }));
    const events = [{ id: "e", type: "exercise_completed" as const, contentType: "exercise", contentRef: "g-ex", payload: {}, createdAt: iso }];
    const r = weeklyReport({ ...base, attempts, responses, events }, info, now, now);
    expect(r.sections.find((s) => s.key === "grammar")!.score).toBe(75);
    expect(r.sections.find((s) => s.key === "consistency")!.score).toBe(25);
    expect(r.recurringMistakes[0]).toMatchObject({ label: "Lesson one — Form", count: 3, href: "/grammar/l1#form" });
    expect(r.overall).toBe(Math.round((25 + 10 + 75) / 3));
    expect(r.weekStart).toBe("2026-11-16");
  });

  it("computes whole-history section progress", () => {
    const p = sectionProgress({ ...base, events: [{ id: "v", type: "lesson_section_viewed", contentType: "grammar_lesson", contentRef: "l1#form", payload: {}, createdAt: iso }] }, info);
    expect(p.rows.find((r) => r.key === "grammar-theory")!.value).toBe(1);
    expect(mondayOf(now).getDay()).toBe(1);
  });
});
