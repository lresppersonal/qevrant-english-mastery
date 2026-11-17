/** A dictionary result shown in the dictionary card. Every field except word/lemma/senses is optional. */
export type SenseSource = "vocabulary" | "core" | "ai" | "wiktionary";

export interface DictSense {
  pos: string;
  definition: string;
  ru?: string;
  examples: string[];
  cefr?: string;
  register?: string;
  source: SenseSource;
  senseRef?: string; // vocabulary sense id, for Save / full entry
}

export interface DictEntry {
  query: string;            // the word as clicked
  lemma: string;            // base form
  formNote?: string;        // e.g. "-ing form of run"
  ipa: { uk?: string; us?: string };
  audio: { uk?: string; us?: string };
  senses: DictSense[];
  contextIndex: number | null; // which sense fits the sentence best (shown first)
  contextNote?: string;        // short explanation of the meaning in this sentence
  grammar?: string;            // grammatical function in this sentence
  collocations: string[];
  synonyms: string[];
  antonyms: string[];
  forms: string[];             // word formation and related forms
  usageNotes: string[];
  cefr?: string;
  register?: string;
  vocabSlug?: string;          // link to the full English Mastery entry
  sources: { name: string; url?: string; license?: string }[];
  missing: string[];           // honest list of what could not be provided, e.g. "Russian translation"
}

export const emptyEntry = (query: string, lemma: string): DictEntry => ({
  query, lemma, ipa: {}, audio: {}, senses: [], contextIndex: null, collocations: [], synonyms: [], antonyms: [], forms: [], usageNotes: [], sources: [], missing: [],
});

/** Normalised part of speech used to match a sense to the word's role in the sentence. */
export type PosClass = "noun" | "verb" | "adjective" | "adverb" | "determiner" | "pronoun" | "preposition" | "conjunction" | "other";
export function posClass(pos: string): PosClass[] {
  const p = pos.toLowerCase();
  const out: PosClass[] = [];
  if (/noun/.test(p) && !/pronoun/.test(p)) out.push("noun");
  if (/verb|modal|auxiliary/.test(p) && !/adverb/.test(p)) out.push("verb");
  if (/adjective/.test(p)) out.push("adjective");
  if (/adverb|linker/.test(p)) out.push("adverb");
  if (/determiner|article|quantifier/.test(p)) out.push("determiner");
  if (/pronoun/.test(p)) out.push("pronoun");
  if (/preposition/.test(p)) out.push("preposition");
  if (/conjunction/.test(p)) out.push("conjunction");
  return out.length ? out : ["other"];
}

/** Put the sense whose part of speech matches the sentence first (keeps the original order otherwise). */
export function pickContextSense(senses: DictSense[], sentencePos: PosClass | null): number | null {
  if (!senses.length) return null;
  if (!sentencePos) return 0;
  const i = senses.findIndex((s) => posClass(s.pos).includes(sentencePos));
  if (i >= 0) return i;
  // determiners are often labelled adjectives in dictionaries (e.g. "many")
  if (sentencePos === "determiner") { const j = senses.findIndex((s) => posClass(s.pos).includes("adjective") || posClass(s.pos).includes("pronoun")); if (j >= 0) return j; }
  return 0;
}
