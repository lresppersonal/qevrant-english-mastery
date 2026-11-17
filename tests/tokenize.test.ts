import { describe, it, expect } from "vitest";
import { lookupForm, segment } from "@/lib/tokenize";

describe("tapped-word lookup form", () => {
  it.each([
    ["don't", "do", /do not/], ["won't", "will", /will not/], ["can’t", "can", /cannot/], ["they're", "they", /they are/],
    ["we've", "we", /we have/], ["she'll", "she", /she will/], ["it's", "it", /it is.*it has/], ["company's", "company", /possessive/],
  ])("%s → %s", (token, lookup, note) => {
    const r = lookupForm(token);
    expect(r.lookup).toBe(lookup);
    expect(r.note).toMatch(note);
  });
  it("leaves ordinary and hyphenated words alone", () => {
    expect(lookupForm("well-being")).toEqual({ lookup: "well-being", note: null });
    expect(lookupForm("Resilience")).toEqual({ lookup: "Resilience", note: null });
  });
  it("splits words from punctuation and keeps contractions whole", () => {
    const words = segment("“Don't panic,” she said—it's fine.", {}).filter((s) => s.word).map((s) => s.text);
    expect(words).toEqual(["Don't", "panic", "she", "said", "it's", "fine"]);
  });
});
