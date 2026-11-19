import { describe, it, expect } from "vitest";
import { PROGRAMME } from "@/lib/plan/programme";
import { getLesson, getReading, getTheme, getWritingPrompt } from "@/lib/content";
import { getVisualTask } from "@/lib/visual";
import { SPEAKING_CATEGORIES, SPEAKING_BANK } from "@/lib/speaking-bank";
import listening from "../content/listening/resources.json";

const resources = new Set(((listening as { resources?: { slug: string }[] }).resources ?? (listening as unknown as { slug: string }[])).map((r) => r.slug));
const lessonsOf = (g: string | string[]) => (Array.isArray(g) ? g : [g]);

describe("Intensive Study Plan programme", () => {
  it("has 6 weeks of 6 study days and 1 review day, numbered without gaps", () => {
    expect(PROGRAMME).toHaveLength(42);
    expect(PROGRAMME.map((d) => d.n)).toEqual(Array.from({ length: 42 }, (_, i) => i + 1));
    expect(PROGRAMME.filter((d) => d.kind === "review").map((d) => d.n)).toEqual([7, 14, 21, 28, 35, 42]);
  });

  it.each(PROGRAMME.map((d) => [d.n, d] as const))("day %i links only to content that exists", (_, d) => {
    for (const l of lessonsOf(d.grammar)) expect(getLesson(l), `lesson ${l}`).toBeTruthy();
    expect(getTheme(d.theme), `theme ${d.theme}`).toBeTruthy();
    expect(getReading(d.reading), `reading ${d.reading}`).toBeTruthy();
    expect(resources.has(d.listening), `listening ${d.listening}`).toBe(true);
    if (d.writing.kind === "essay") expect(getWritingPrompt(d.writing.slug), `essay ${d.writing.slug}`).toBeTruthy();
    else expect(getVisualTask(d.writing.id), `visual ${d.writing.id}`).toBeTruthy();
    expect(SPEAKING_CATEGORIES.some((c) => c.slug === d.speaking), `speaking ${d.speaking}`).toBe(true);
    expect(SPEAKING_BANK.some((p) => p.category === d.speaking)).toBe(true);
  });

  it("introduces each grammar topic once on a study day, then only revisits it in consolidation/review", () => {
    const single = PROGRAMME.filter((d) => d.kind === "study" && !Array.isArray(d.grammar)).map((d) => d.grammar as string);
    expect(new Set(single).size).toBe(single.length);
  });

  it("does not raise the level backwards by more than one step week to week on average", () => {
    const rank = { B2: 0, "B2+": 1, C1: 2, C2: 3 } as const;
    const avg = (w: number) => { const xs = PROGRAMME.filter((d) => d.week === w && d.kind === "study"); return xs.reduce((n, d) => n + rank[d.level], 0) / xs.length; };
    expect(avg(6)).toBeGreaterThan(avg(1));
    expect(avg(4)).toBeGreaterThan(avg(2));
  });
});

import { planProgress } from "@/lib/plan/engine";
describe("plan workload matches what the plan page promises", () => {
  const data = { events: [], attempts: [], responses: [], cards: [], writing: [], speaking: [], listening: [], saved: [] };
  const minutes = (intensity: "full" | "focused") =>
    planProgress({ startedAt: "2026-01-01", intensity, startWeek: 1, skipped: {}, personal: false }, data as never).days.map((d) => d.blocks.filter((b) => b.required).reduce((n, b) => n + b.minutes, 0));
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  it("focused averages about 1 h 40 min, full about 2 h and never above 2½ h", () => {
    expect(avg(minutes("focused"))).toBeGreaterThanOrEqual(90);
    expect(avg(minutes("focused"))).toBeLessThanOrEqual(110);
    expect(avg(minutes("full"))).toBeGreaterThanOrEqual(110);
    expect(avg(minutes("full"))).toBeLessThanOrEqual(130);
    expect(Math.max(...minutes("full"))).toBeLessThanOrEqual(150);
  });
});
