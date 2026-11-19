import { describe, it, expect } from "vitest";
import { computePriorities, readAssessment, readOverrides, type Assessment, type Evidence } from "@/lib/plan/personal";
import { planProgress, personaliseDay, type PlanSettings, type PlanData } from "@/lib/plan/engine";
import { PROGRAMME } from "@/lib/plan/programme";
import type { Profile } from "@/lib/store/types";

const empty: Evidence & PlanData = { responses: [], attempts: [], reviewLogs: [], listening: [], writing: [], speaking: [], events: [], cards: [], saved: [] };
const listeningWeak: Assessment = { ratings: { grammar: 4, vocabulary: 4, reading: 5, listening: 1, speaking: 2, writing: 3 }, focus: ["listening"], updatedAt: "" };
const grammarWeak: Assessment = { ratings: { grammar: 1, vocabulary: 5, reading: 4, listening: 4, speaking: 4, writing: 2 }, focus: ["grammar", "writing"], updatedAt: "" };
const pr = (a: Assessment | null, e: Evidence = empty, o = {}) => Object.fromEntries(computePriorities(a, e, o).map((p) => [p.skill, p.priority]));
const settings: PlanSettings = { startedAt: "2026-11-01T00:00:00.000Z", intensity: "focused", startWeek: 1, skipped: {}, personal: true };

describe("personal priorities", () => {
  it("two learners with different weaknesses get different priorities", () => {
    const a = pr(listeningWeak), b = pr(grammarWeak);
    expect(a.listening).toBe("high"); expect(a.reading).toBe("maintenance");
    expect(b.grammar).toBe("high"); expect(b.vocabulary).toBe("maintenance");
    expect(a).not.toEqual(b);
  });
  it("keeps at most two automatic high priorities", () => {
    const all1: Assessment = { ratings: { grammar: 1, vocabulary: 1, reading: 1, listening: 1, speaking: 1, writing: 1 }, focus: [], updatedAt: "" };
    expect(Object.values(pr(all1)).filter((x) => x === "high").length).toBe(2);
  });
  it("without a self-assessment or results, everything stays medium", () => {
    expect(new Set(Object.values(pr(null)))).toEqual(new Set(["medium"]));
  });
  it("adapts: strong recent listening results lower a low self-rating", () => {
    const now = Date.now();
    const logs = [5, 5, 4].map((c, i) => ({ id: `l${i}`, resourceSlug: "ted-ed", episode: "", minutes: 20, comprehension: c, notes: "", createdAt: new Date(now - i * 864e5).toISOString() }));
    const before = computePriorities(listeningWeak, empty).find((p) => p.skill === "listening")!;
    const after = computePriorities(listeningWeak, { ...empty, listening: logs as never }).find((p) => p.skill === "listening")!;
    expect(after.need).toBeLessThan(before.need);
    expect(after.source).toBe("both");
    expect(after.reasons.join(" ")).toMatch(/average/);
  });
  it("a manual priority always wins and is explained", () => {
    const p = computePriorities(listeningWeak, empty, { reading: "high" }).find((x) => x.skill === "reading")!;
    expect(p.priority).toBe("high"); expect(p.source).toBe("manual");
    expect(p.reasons.join(" ")).toMatch(/You set this/);
  });
  it("reads only valid stored data", () => {
    const prof = { preferences: { assessment: { ratings: { grammar: 9, listening: 2, x: 3 }, focus: ["listening", "nope"] }, priorities: { reading: "high", grammar: "weird" } } } as unknown as Profile;
    expect(readAssessment(prof)).toMatchObject({ ratings: { listening: 2 }, focus: ["listening"] });
    expect(readOverrides(prof)).toEqual({ reading: "high" });
  });
});

describe("personalised days", () => {
  const day = PROGRAMME[0];
  it("never removes an area and adds integrated focus blocks for high priorities", () => {
    const universal = planProgress({ ...settings, personal: false }, empty).days[0].blocks;
    const ps = computePriorities(listeningWeak, empty);
    const mine = personaliseDay(universal, day, settings.startedAt, empty, settings, ps);
    for (const b of universal) expect(mine.some((m) => m.key === b.key)).toBe(true);
    const focus = mine.filter((b) => b.key === "focus");
    expect(focus.map((f) => f.skill)).toContain("listening");
    expect(mine.find((b) => b.key === "listening")!.required).toBe(true);
    expect(mine.find((b) => b.key === "reading")!.minutes).toBeLessThan(universal.find((b) => b.key === "reading")!.minutes);
  });
  it("different learners get different days; the universal programme is unchanged", () => {
    const snapshot = JSON.stringify(PROGRAMME);
    const a = planProgress(settings, empty, computePriorities(listeningWeak, empty)).days[0].blocks;
    const b = planProgress(settings, empty, computePriorities(grammarWeak, empty)).days[0].blocks;
    expect(a.filter((x) => x.key === "focus").map((x) => x.skill)).not.toEqual(b.filter((x) => x.key === "focus").map((x) => x.skill));
    expect(JSON.stringify(PROGRAMME)).toBe(snapshot);
  });
  it("the standard plan ignores priorities", () => {
    const std = planProgress({ ...settings, personal: false }, empty, computePriorities(listeningWeak, empty)).days[0].blocks;
    expect(std.some((b) => b.key === "focus")).toBe(false);
  });
  it("a focus block is completed only by real activity after the day began", () => {
    const ps = computePriorities(grammarWeak, empty);
    const lesson = Array.isArray(day.grammar) ? day.grammar[0] : day.grammar;
    const data = { ...empty, attempts: [{ id: "a1", exerciseSlug: `grammar-recognise-${lesson}`, exerciseVersion: 1, score: 5, total: 7, startedAt: "2026-11-02T10:00:00Z", completedAt: "2026-11-02T10:05:00Z" }] };
    const v = planProgress(settings, data, ps).days[0];
    expect(v.blocks.find((b) => b.key === "focus" && b.skill === "grammar")!.doneAt).toBe("2026-11-02T10:05:00Z");
  });
});
