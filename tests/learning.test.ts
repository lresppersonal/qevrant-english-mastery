import { describe, it, expect } from "vitest";
import { mistakeQueue, weakAreas, todaysPlan, buildSmartSet, questionPool, cycleInfo, neglectedSkills, type LearnerSnapshot } from "@/lib/learning";
import { recurringIssues, wordDiff, compareVersions, developmentSummary, bandSeries } from "@/lib/portfolio";
import { ruleSummary, rulesFor } from "@/lib/content";
import type { ResponseRow } from "@/lib/store/types";

const empty: LearnerSnapshot = { events: [], responses: [], attempts: [], cards: [], reviewLogs: [], saved: [], writing: [], speaking: [], listening: [], selfLevel: null };
const LESSON = [...questionPool().values()].find((p) => p.lesson && [...questionPool().values()].filter((x) => x.lesson === p.lesson).length >= 4)!.lesson!;
const pool = [...questionPool().values()].filter((p) => p.lesson === LESSON);
const resp = (id: string, correct: boolean, at: string): ResponseRow => ({ attemptId: "a", questionId: id, targetRef: LESSON, response: 0, correct, errorTag: null, createdAt: at });

describe("learning engine", () => {
  it("keeps a question in the mistake queue until the latest answer is correct", () => {
    const id = pool[0].key;
    expect(mistakeQueue([resp(id, false, "2026-01-01T00:00:00Z")], []).map((m) => m.id)).toEqual([id]);
    expect(mistakeQueue([resp(id, false, "2026-01-01T00:00:00Z"), resp(id, true, "2026-01-02T00:00:00Z")], [])).toEqual([]);
  });

  it("flags a lesson as weak when accuracy is below 70% on at least 3 answers", () => {
    const rs = pool.slice(0, 4).map((p, i) => resp(p.key, i === 0, `2026-01-0${i + 1}T00:00:00Z`));
    const w = weakAreas({ ...empty, responses: rs }, Date.parse("2026-01-05T00:00:00Z"));
    expect(w.some((x) => x.key === `lesson:${LESSON}` && x.practiceHref === `/practice/smart?lesson=${LESSON}`)).toBe(true);
  });

  it("builds a plan for a brand-new learner without crashing and with real links", () => {
    const p = todaysPlan(empty);
    expect(p.tasks.length).toBeGreaterThan(0);
    for (const t of p.tasks) expect(t.href.startsWith("/")).toBe(true);
  });

  it("builds smart sets from real questions, mistakes first", () => {
    const wrong = pool[2].key;
    const s = buildSmartSet({ attempts: [], responses: [resp(wrong, false, "2026-01-01T00:00:00Z")] }, "lesson", { lesson: LESSON, seed: 1 });
    expect(s?.exercise.questions[0].id).toBe(wrong);
    expect(s?.exercise.slug).toBe(`smart-lesson-${LESSON}`);
    expect(buildSmartSet({ attempts: [], responses: [] }, "mistakes")).toBeNull();
    expect(buildSmartSet({ attempts: [], responses: [resp(wrong, false, "2026-01-01T00:00:00Z")] }, "mistakes")?.exercise.questions).toHaveLength(1);
  });

  it("keeps questions with the same short id in different exercises apart", () => {
    const all = [...questionPool().values()];
    const shortIds = all.map((p) => p.question.id);
    expect(new Set(all.map((p) => p.key)).size).toBe(all.length);
    expect(new Set(shortIds).size).toBeLessThan(all.length);
    const [a, b] = all.filter((p) => p.question.id === "q1");
    const attempts = [{ id: "A", exerciseSlug: a.exercise.slug }, { id: "B", exerciseSlug: b.exercise.slug }];
    const q = mistakeQueue([{ ...resp("q1", false, "2026-01-01T00:00:00Z"), attemptId: "A" }, { ...resp("q1", true, "2026-01-02T00:00:00Z"), attemptId: "B" }], attempts);
    expect(q.map((m) => m.id)).toEqual([a.key]);
  });

  it("describes the learning cycle for a lesson", () => {
    const c = cycleInfo(LESSON);
    expect(c!.questionIds.length).toBeGreaterThan(0);
  });

  it("reports skills that have not been used for over a week", () => {
    expect(neglectedSkills(empty).length).toBeGreaterThan(0);
  });
});

describe("rule summaries", () => {
  it("gives a short rule for every theory anchor used in practice", () => {
    const ex = pool[0].exercise;
    const rules = rulesFor([ex]);
    const anchors = ex.questions.filter((q) => q.theoryAnchor);
    expect(Object.keys(rules).length).toBeGreaterThan(0);
    for (const q of anchors) expect(rules[`${q.theoryAnchor!.lesson}#${q.theoryAnchor!.section}`]?.length).toBeGreaterThan(10);
    expect(ruleSummary("no-such-lesson")).toBeNull();
  });
});

const essay = (id: string, at: string, band: number, issues: { category: string; grammarRef?: string | null; severity?: string }[], body = "x") =>
  ({ id, promptSlug: "p", createdAt: at, status: "assessed", wordCount: body.split(" ").length, body, feedback: { estimate: { mean: band }, criteria: [{ criterion: "task_response", band }], issues: issues.map((i) => ({ quote: "q", suggestion: "s", severity: "error", grammarRef: null, ...i })) } });

describe("portfolio", () => {
  const a = essay("1", "2026-01-01", 5.5, [{ category: "grammar", grammarRef: "lesson:articles#basics" }, { category: "collocation" }]);
  const b = essay("2", "2026-02-01", 6, [{ category: "grammar", grammarRef: "lesson:articles#basics" }]);
  const c = essay("3", "2026-03-01", 6.5, [{ category: "cohesion" }, { category: "register", severity: "style" }]);

  it("finds mistakes recurring across essays and their trend", () => {
    const r = recurringIssues([a, b, c]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ grammarRef: "lesson:articles#basics", pieces: 2, trend: "improving" });
  });

  it("compares versions by band, criteria and problem types", () => {
    const cmp = compareVersions(a, b);
    expect(cmp.band).toEqual({ before: 5.5, after: 6 });
    expect(cmp.categories.find((x) => x.category === "collocation")).toEqual({ category: "collocation", before: 1, after: 0 });
  });

  it("diffs two versions word by word", () => {
    const d = wordDiff("I think it is good", "I believe it is good");
    expect(d.filter((p) => p.type === "removed").map((p) => p.text.trim())).toEqual(["think"]);
    expect(d.filter((p) => p.type === "added").map((p) => p.text.trim())).toEqual(["believe"]);
  });

  it("summarises development only with enough evidence", () => {
    expect(developmentSummary([a])).toBeNull();
    expect(developmentSummary([a, b, c])).toMatch(/risen/);
    expect(bandSeries([c, a]).map((s) => s.id)).toEqual(["1", "3"]);
  });
});
