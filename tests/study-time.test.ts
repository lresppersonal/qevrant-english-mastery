import { describe, it, expect } from "vitest";
import { activeMinutesByDay, heatLevel, monthGrid, completedBySkill } from "@/lib/study-time";

describe("study time", () => {
  it("counts only measured time and caps idle exercises", () => {
    const m = activeMinutesByDay({
      attempts: [
        { startedAt: new Date(2026, 10, 2, 10, 0).toISOString(), completedAt: new Date(2026, 10, 2, 10, 12).toISOString() },
        { startedAt: new Date(2026, 10, 2, 11, 0).toISOString(), completedAt: new Date(2026, 10, 2, 15, 0).toISOString() }, // left open: capped at 30
      ],
      listening: [{ minutes: 20, createdAt: new Date(2026, 10, 3, 9).toISOString() }],
      speaking: [{ durationSeconds: 120, createdAt: new Date(2026, 10, 3, 9).toISOString() }],
    });
    expect(m.get("2026-11-02")).toBe(42);
    expect(m.get("2026-11-03")).toBe(22);
    expect(m.has("2026-11-04")).toBe(false);
  });
  it("uses the stated heatmap thresholds", () => {
    expect([0, 1, 14, 15, 29, 30, 44, 45, 59, 60, 200].map(heatLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it("builds Monday-first month grids", () => {
    const g = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(g[0].slice(0, 6).every((d) => d === null)).toBe(true);
    expect(g[0][6]?.getDate()).toBe(1);
    expect(g.flat().filter(Boolean)).toHaveLength(30);
  });
  it("counts completed material per area", () => {
    const c = completedBySkill([{ type: "reading_completed", contentType: "reading" }, { type: "exercise_completed", contentType: "grammar_check" }, { type: "item_saved", contentType: "word" }]);
    expect(c.reading).toBe(1); expect(c.grammar).toBe(1); expect(c.vocabulary).toBe(0);
  });
});
