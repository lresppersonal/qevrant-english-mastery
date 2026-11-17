import { describe, it, expect } from "vitest";
import { lemmaCandidates } from "@/lib/dictionary/lemmatize";
import { createLocalDictionary, type CoreWord } from "@/lib/dictionary/local";
import { pickContextSense } from "@/lib/dictionary/types";
import { vocabItems, readingTexts } from "@/lib/content";
import core from "@content/generated/core-lexicon.json";

const local = createLocalDictionary(vocabItems, core as CoreWord[]);

describe("lemmatizer", () => {
  it("finds base forms of regular and irregular forms", () => {
    expect(lemmaCandidates("running").map((c) => c.lemma)).toContain("run");
    expect(lemmaCandidates("studies").map((c) => c.lemma)).toContain("study");
    expect(lemmaCandidates("went")[1]).toMatchObject({ lemma: "go", note: "past simple of go" });
    expect(lemmaCandidates("children")[1].lemma).toBe("child");
    expect(lemmaCandidates("better")[1].lemma).toBe("good");
    expect(lemmaCandidates("making").map((c) => c.lemma)).toContain("make");
  });
});

describe("local dictionary", () => {
  it("answers common grammar words with Russian", () => {
    for (const w of ["many", "although", "within", "despite", "throughout", "unless"]) {
      const e = local.lookup(w);
      expect(e, w).not.toBeNull();
      expect(e!.senses[0].ru, w).toBeTruthy();
    }
  });
  it("maps inflected forms to entries and says so", () => {
    const e = local.lookup("running")!;
    expect(e.lemma).toBe("run");
    expect(e.formNote).toBe("-ing form of run");
  });
  it("chooses the sense that matches the part of speech in the sentence", () => {
    const senses = [{ pos: "noun", definition: "n", examples: [], source: "wiktionary" as const }, { pos: "verb", definition: "v", examples: [], source: "wiktionary" as const }];
    expect(pickContextSense(senses, "verb")).toBe(1);
    expect(pickContextSense(senses, null)).toBe(0);
  });
  it("reports how many reading words are answered locally", () => {
    const words = new Set(readingTexts.flatMap((t) => t.paragraphs.join(" ").replace(/\[[A-Z]\]/g, "").match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? []).map((w) => w.toLowerCase()));
    const covered = [...words].filter((w) => local.lookup(w)).length;
    console.log(`reading vocabulary: ${words.size} distinct words, ${covered} answered locally`);
    expect(covered / words.size).toBeGreaterThan(0.25);
  });
});

describe.runIf(process.env.LIVE_DICTIONARY === "1")("live hybrid lookup (network)", () => {
  it("resolves words that are not in the local database", async () => {
    const { lookupWord } = await import("@/lib/dictionary/server");
    const e = await lookupWord("ubiquitous", "Smartphones have become ubiquitous in modern life.", { allowAi: false });
    expect(e.senses.length).toBeGreaterThan(0);
    expect(e.ipa.uk ?? e.ipa.us).toBeTruthy();
    const r = await lookupWord("pondered", "She pondered the question for a long time.", { allowAi: false });
    expect(r.lemma).toBe("ponder");
    expect(r.formNote).toContain("ponder");
    const m = await lookupWord("many", "Many people believe it.", { allowAi: false });
    expect(m.audio.us).toMatch(/many-us\.mp3$/);
    console.log(JSON.stringify({ ubiquitous: { ipa: e.ipa, audio: e.audio, first: e.senses[0], grammar: e.grammar }, pondered: { lemma: r.lemma, note: r.formNote, grammar: r.grammar, ctx: r.senses[r.contextIndex ?? 0] } }, null, 1));
  }, 30000);
});
