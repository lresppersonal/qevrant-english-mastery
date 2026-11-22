import { describe, it, expect } from "vitest";
import { weekDates, weeklySkillGrid, skillOfEvent } from "@/lib/weekly";

const now = new Date(2026, 10, 25, 12); // Wednesday 25 Nov 2026
describe("weekly skill grid", () => {
  it("weeks start on Monday", () => {
    expect(weekDates(now)[0]).toBe("2026-11-23");
    expect(weekDates(now)[6]).toBe("2026-11-29");
    expect(weekDates(new Date(2026, 10, 29, 9))[0]).toBe("2026-11-23"); // Sunday belongs to the same week
  });
  it("maps activities to the six areas; Grammar includes practice, opening pages does not count", () => {
    expect(skillOfEvent({ type: "exercise_completed", contentType: "grammar_recognise" })).toBe("grammar");
    expect(skillOfEvent({ type: "writing_submitted", contentType: "writing" })).toBe("writing");
    expect(skillOfEvent({ type: "item_saved", contentType: "word" })).toBeNull();
  });
  it("counts real completed tasks per day and ignores other weeks", () => {
    const ev = [
      { type: "reading_completed" as const, contentType: "reading", createdAt: new Date(2026, 10, 23, 10).toISOString() },
      { type: "reading_completed" as const, contentType: "reading", createdAt: new Date(2026, 10, 23, 18).toISOString() },
      { type: "speaking_submitted" as const, contentType: "speaking", createdAt: new Date(2026, 10, 16, 10).toISOString() },
    ];
    const g = weeklySkillGrid(ev, null, now);
    expect(g.rows.reading[0]).toEqual({ done: 2, planned: 0 });
    expect(g.rows.speaking.every((c) => c.done === 0)).toBe(true);
  });
  it("places the current plan day on today and later days after it", () => {
    const block = (key: string) => ({ key, label: "", title: "", why: "", href: "", minutes: 10, required: true, doneAt: null });
    const days = [
      { status: "current", blocks: [block("grammar"), block("listening")] },
      { status: "upcoming", blocks: [block("writing")] },
    ] as never;
    const g = weeklySkillGrid([], days, now);
    expect(g.rows.grammar[2].planned).toBe(1);
    expect(g.rows.writing[3].planned).toBe(1);
  });
});
