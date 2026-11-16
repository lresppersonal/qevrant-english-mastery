import { describe, it, expect } from "vitest";
import { validateGraph, vocabItems, grammarLessons, exercises, allSenses, buildFormIndex, getReading, themes, itemsInTheme, writingPrompts, essayGuides, readingTexts, getExercise, grammarDomains, lexClassOf } from "@/lib/content";
import { ESSAY_TYPES } from "@/lib/content/schema";
import { segment, sentenceAt } from "@/lib/tokenize";
import { buildSearchIndex, search } from "@/lib/search";

describe("content", () => {
  it("passes schema and cross-reference validation", () => {
    expect(validateGraph()).toEqual([]);
  });
  it("meets the vertical-slice scope (≈40 senses, 2 lessons, 3+ exercise sets)", () => {
    expect(allSenses().length).toBeGreaterThanOrEqual(40);
    expect(grammarLessons.length).toBeGreaterThanOrEqual(17);
    expect(exercises.length).toBeGreaterThanOrEqual(3);
  });
  it("gives every sense a Russian translation", () => {
    for (const { sense } of allSenses()) expect(sense.translations.ru.length).toBeGreaterThan(1);
  });
  it("keeps one canonical record per lemma, with level-tagged senses", () => {
    const lemmas = vocabItems.map((v) => v.lemma);
    expect(new Set(lemmas).size).toBe(lemmas.length);
    const scholarship = vocabItems.find((v) => v.slug === "scholarship")!;
    expect(scholarship.senses.map((s) => s.level)).toEqual(["B2", "C1"]);
  });
  it("gives vocabulary stable UUIDs", () => {
    const a = vocabItems.find((v) => v.slug === "setback")!.id;
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("links C1 nominal relatives back to B2 relative clauses", () => {
    const nom = grammarLessons.find((l) => l.slug === "nominal-relative-clauses")!;
    expect(nom.links).toContainEqual(expect.objectContaining({ type: "prerequisite", to: "relative-clauses", published: true }));
  });
});

describe("tap-to-define tokenizer", () => {
  const forms = buildFormIndex();
  it("matches multi-word expressions before single words", () => {
    const segs = segment("Supporters point to formative assessment, which helps.", forms);
    const head = segs.find((s) => s.text === "formative")!;
    expect(head.match).toEqual({ slug: "formative-assessment", length: 2 });
    expect(segs.find((s) => s.text === "assessment")!.partOf).toBeDefined();
  });
  it("finds inflected forms", () => {
    const segs = segment("They dropped out and fell behind.", forms);
    expect(segs.find((s) => s.text === "dropped")!.match?.slug).toBe("drop-out");
  });
  it("does not match across punctuation", () => {
    const segs = segment("They had to drop. Out of time.", forms);
    expect(segs.find((s) => s.text === "drop")!.match).toBeUndefined();
  });
  it("highlights most target vocabulary in the reading text", () => {
    const text = getReading("is-failure-the-best-teacher")!;
    const slugs = new Set(text.paragraphs.flatMap((p) => segment(p, forms).filter((s) => s.match).map((s) => s.match!.slug)));
    expect(slugs.size).toBeGreaterThanOrEqual(25);
  });
  it("returns the sentence around a word for saved context", () => {
    const p = "First sentence here. The setback was big. Last one.";
    expect(sentenceAt(p, p.indexOf("setback"))).toBe("The setback was big.");
  });
});

describe("search", () => {
  const index = buildSearchIndex();
  it("finds words by English and Russian", () => {
    expect(search(index, "setback")[0].title).toBe("setback");
    expect(search(index, "плагиат").some((r) => r.title === "plagiarism")).toBe(true);
  });
  it("finds grammar sections", () => {
    expect(search(index, "comment clauses").some((r) => r.href === "/grammar/relative-clauses#comment-clauses")).toBe(true);
  });
});

describe("educational architecture (v0.4)", () => {
  it("organises vocabulary by theme, with CEFR kept as metadata", () => {
    expect(themes.length).toBeGreaterThanOrEqual(20);
    for (const t of themes) expect(itemsInTheme(t.slug).length, t.slug).toBeGreaterThanOrEqual(10);
    for (const { sense } of allSenses()) expect(["B2", "B2+", "C1", "C2"]).toContain(sense.level);
  });
  it("stores each word once, with extra themes as tags", () => {
    const slugs = vocabItems.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const multi = vocabItems.filter((v) => new Set(v.senses.flatMap((s) => s.topics)).size > 1);
    expect(multi.length).toBeGreaterThan(50);
  });
  it("gives every entry a lexical class, Russian, definition and example", () => {
    for (const v of vocabItems) {
      expect(lexClassOf(v)).toBeTruthy();
      for (const s of v.senses) { expect(s.translations.ru).toBeTruthy(); expect(s.definition).toBeTruthy(); expect(s.examples[0]).toBeTruthy(); }
    }
  });
  it("pairs every grammar lesson with a practice set of mixed formats and levels", () => {
    for (const l of grammarLessons) {
      const qs = l.exercises.flatMap((e) => getExercise(e)!.questions);
      expect(qs.length, l.slug).toBeGreaterThanOrEqual(9);
    }
    const generated = grammarLessons.filter((l) => !["relative-clauses", "nominal-relative-clauses"].includes(l.slug));
    for (const l of generated) {
      const qs = l.exercises.flatMap((e) => getExercise(e)!.questions);
      expect(new Set(qs.map((q) => q.format)).size, l.slug).toBeGreaterThanOrEqual(3);
      expect(new Set(qs.map((q) => q.level)).size, l.slug).toBeGreaterThanOrEqual(2);
    }
  });
  it("links most grammar subtopics to a published lesson", () => {
    const all = grammarDomains.flatMap((d) => d.topics);
    expect(all.filter((t) => t.lesson).length / all.length).toBeGreaterThan(0.85);
    for (const d of grammarDomains.filter((d) => !["prepositions"].includes(d.key))) expect(d.topics.some((t) => t.lesson), d.key).toBe(true);
  });
  it("offers a reading library with several IELTS task formats", () => {
    expect(readingTexts.length).toBeGreaterThanOrEqual(10);
    const formats = new Set(readingTexts.flatMap((r) => r.exercises.map((e) => getExercise(e)!.format)));
    for (const f of ["tfng", "multiple_choice", "matching_headings", "matching_information", "sentence_completion", "summary_completion", "short_answer"]) expect(formats.has(f as never), f).toBe(true);
  });
  it("covers all eight essay types with several questions each", () => {
    for (const t of ESSAY_TYPES) expect(writingPrompts.filter((p) => p.genre === t).length, t).toBeGreaterThanOrEqual(4);
    expect(essayGuides).toHaveLength(8);
  });
});
