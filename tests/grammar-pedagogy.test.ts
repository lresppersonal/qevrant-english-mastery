import { describe, it, expect } from "vitest";
import { grammarLessons, exercises } from "@/lib/content";
import { buildParts } from "@/lib/grammar-parts";

describe("grammar lessons follow the teaching sequence", () => {
  it("has all 37 lessons", () => expect(grammarLessons.length).toBe(37));
  for (const l of grammarLessons) {
    describe(l.slug, () => {
      it("opens with the core concept and keeps the A–I order", () => {
        const parts = buildParts(l);
        expect(parts[0].key).toBe("A");
        expect(parts[0].sections[0].kind).toBe("core");
        expect(parts.map((p) => p.key).join("")).toBe([...parts.map((p) => p.key)].sort().join(""));
        expect(parts.some((p) => p.key === "H")).toBe(true);
      });
      it("states mistakes as Incorrect → Correct → Why", () => {
        const rows = l.sections.filter((s) => s.kind === "errors").flatMap((s) => s.blocks).flatMap((b) => (b.type === "mistakes" ? b.rows : []));
        expect(rows.length).toBeGreaterThanOrEqual(4);
        for (const r of rows) { expect(r.wrong).not.toBe(r.right); expect(r.why.length).toBeGreaterThan(15); }
      });
      it("has a Recognise passage with marked forms and distractors", () => {
        const s = l.recognise!.sentences;
        expect(s.filter((x) => x.has).length).toBeGreaterThanOrEqual(3);
        expect(s.filter((x) => !x.has).length).toBeGreaterThanOrEqual(1);
        for (const x of s) expect(/\[\[.+?\]\]/.test(x.text)).toBe(x.has);
        for (const x of s.filter((y) => y.has)) expect(x.note?.length ?? 0).toBeGreaterThan(5);
      });
      it("ends the theory with a quick check of at least four items", () => {
        expect(l.check.length).toBeGreaterThanOrEqual(4);
        for (const c of l.check) {
          if (c.kind === "choice") {
            expect(c.answer).toBeLessThan(c.options.length);
            expect(new Set(c.options).size).toBe(c.options.length);
          } else expect(c.model.length).toBeGreaterThan(20);
        }
        expect(l.check.some((c) => c.kind === "explain")).toBe(true);
      });
      it("has a Produce task with a self-check list", () => {
        expect(l.produce!.prompt.length).toBeGreaterThan(40);
        expect(l.produce!.checklist.length).toBeGreaterThanOrEqual(3);
      });
      it("keeps every practice question's theory anchor valid", () => {
        const ids = new Set(l.sections.map((s) => s.id));
        for (const ex of exercises.filter((e) => e.target.type === "lesson" && e.target.ref === l.slug))
          for (const q of ex.questions) if (q.theoryAnchor?.lesson === l.slug) expect(ids.has(q.theoryAnchor.section)).toBe(true);
      });
    });
  }
});
