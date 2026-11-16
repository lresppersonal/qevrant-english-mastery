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
