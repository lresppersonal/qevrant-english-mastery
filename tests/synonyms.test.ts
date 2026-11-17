import { describe, it, expect } from "vitest";
import { SYNONYM_GROUPS, allSynExercises, SYN_TYPES } from "@/lib/synonyms";

describe("Academic & Advanced Synonyms content", () => {
  it("has groups across categories, and every exercise type", () => {
    expect(SYNONYM_GROUPS.length).toBeGreaterThanOrEqual(16);
    const types = new Set(allSynExercises().map((e) => e.type));
    for (const t of SYN_TYPES) expect(types.has(t), t).toBe(true);
  });
  it.each(allSynExercises().map((e) => [e.id, e] as const))("%s: one best answer, every option explained, target marked when needed", (_, e) => {
    expect(new Set(e.options.map((o) => o.toLowerCase())).size).toBe(4);
    expect(e.optionNotes[e.answer]).toMatch(/^Correct/);
    e.optionNotes.forEach((n, i) => { if (i !== e.answer) expect(n).not.toMatch(/^Correct/); });
    if (e.type === "replace") expect(e.sentence).toMatch(/\*\*[^*]+\*\*/);
    if (["precise", "collocation"].includes(e.type)) expect(e.sentence).toContain("____");
  });
  it("ids are unique", () => {
    expect(new Set(SYNONYM_GROUPS.map((g) => g.id)).size).toBe(SYNONYM_GROUPS.length);
  });
});
