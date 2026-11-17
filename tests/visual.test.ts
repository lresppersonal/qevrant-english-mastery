import { describe, it, expect } from "vitest";
import { getVisualTask, catalogue, newTaskId } from "@/lib/visual";
import { CHART_TEMPLATES } from "@/lib/visual/charts";
import type { Figure } from "@/lib/visual";

const numbers = (f: Figure): number[] =>
  f.kind === "line" || f.kind === "bar" ? f.series.flatMap((s) => s.values) : f.kind === "pie" ? f.slices.map((s) => s.value) : f.kind === "table" ? f.rows.flatMap((r) => r.values) : [];

describe("visual data description tasks", () => {
  const generated = Object.entries(CHART_TEMPLATES).flatMap(([type, n]) => Array.from({ length: n }, (_, t) => Array.from({ length: 25 }, (_, k) => `${type}-${t}-${k * 3917 + 11}`)).flat());

  it("regenerates exactly the same task from its id (figure, instruction and AI facts agree)", () => {
    for (const id of generated.slice(0, 60)) expect(JSON.stringify(getVisualTask(id))).toBe(JSON.stringify(getVisualTask(id)));
  });

  it.each(generated.map((id) => [id]))("%s has consistent, plausible data", (id) => {
    const t = getVisualTask(id)!;
    expect(t, id).toBeTruthy();
    expect(t.instruction).toMatch(/Write at least 150 words\.$/);
    expect(t.keyFeatures.length).toBeGreaterThan(1);
    for (const f of t.figures) {
      const ns = numbers(f);
      for (const v of ns) { expect(Number.isFinite(v)).toBe(true); if (!("unit" in f && f.unit === "°C")) expect(v).toBeGreaterThanOrEqual(0); }
      if (f.kind === "pie") expect(f.slices.reduce((a, s) => a + s.value, 0)).toBe(100);
      if (f.kind === "line" || f.kind === "bar") for (const s of f.series) expect(s.values).toHaveLength(f.x.length);
      if (f.kind === "table") for (const r of f.rows) expect(r.values).toHaveLength(f.columns.length);
      if ("unit" in f && f.unit === "%") for (const v of ns) expect(v).toBeLessThanOrEqual(100);
      // every plotted number is in the facts sent to the AI assessor
      for (const v of ns) expect(t.facts).toContain(String(v));
    }
    // the years named in a line graph's instruction are the ones plotted
    const line = t.figures.find((f) => f.kind === "line");
    if (line && line.kind === "line" && /^\d{4}$/.test(line.x[0])) {
      const yrs = t.instruction.match(/\b(19|20)\d{2}\b/g) ?? [];
      for (const y of yrs) expect(line.x.includes(y) || t.figures.some((f) => (f.kind === "pie" && f.title.includes(y)) || (f.kind === "bar" && f.series.some((s) => s.name === y)) || (f.kind === "table" && f.columns.includes(y)))).toBe(true);
    }
  });

  it("offers every type in all four groups, with library items resolving", () => {
    const cat = catalogue();
    expect(cat.map((c) => c.group)).toEqual(["charts", "diagrams", "maps", "combined"]);
    for (const g of cat) for (const t of g.types) {
      expect(t.generated || t.library.length > 0, t.type).toBe(true);
      for (const id of t.library) expect(getVisualTask(id), id).toBeTruthy();
      expect(getVisualTask(newTaskId(t.type))).toBeTruthy();
    }
  });
});
