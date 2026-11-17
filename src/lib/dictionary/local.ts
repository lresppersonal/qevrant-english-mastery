import type { VocabItem } from "@/lib/content/schema";
import { emptyEntry, pickContextSense, type DictEntry, type PosClass } from "./types";
import { lemmaCandidates } from "./lemmatize";

export interface CoreWord { word: string; pos: string; ru: string; definition: string; example: string; note: string; forms: string[]; group: string }

/**
 * Local dictionary: the English Mastery vocabulary database plus the core lexicon of
 * grammar words. Works offline and on the client (it takes the data as arguments).
 */
const GROUP_LABEL: Record<string, string> = {
  "Determiners and quantifiers": "determiner (quantifier) — comes before a noun", Pronouns: "pronoun", Prepositions: "preposition — followed by a noun, pronoun or -ing form",
  "Conjunctions and linkers": "conjunction or linking word — connects clauses or ideas", "Adverbs of degree, frequency and stance": "adverb",
  "Auxiliary and modal verbs": "auxiliary or modal verb", "Common verbs": "verb",
};

/** How a clicked form relates to its base form, e.g. "-ing form of run". */
const noteFor = (q: string, lemma: string) => lemmaCandidates(q).find((x) => x.lemma === lemma.toLowerCase())?.note;

export function createLocalDictionary(items: VocabItem[], core: CoreWord[]) {
  const byForm = new Map<string, VocabItem>();
  for (const it of items) for (const f of [it.lemma, ...it.forms]) byForm.set(f.toLowerCase(), it);
  const coreBy = new Map<string, CoreWord>();
  for (const c of core) { coreBy.set(c.word.toLowerCase(), c); for (const f of c.forms) if (!coreBy.has(f.toLowerCase()) && !f.includes(" ")) coreBy.set(f.toLowerCase(), c); }

  function fromVocab(it: VocabItem, query: string, note?: string): DictEntry {
    const e = emptyEntry(query, it.lemma);
    e.formNote = note && it.lemma.toLowerCase() !== query.toLowerCase() ? note : undefined;
    if (it.ipa) e.ipa.uk = it.ipa;
    e.senses = it.senses.map((s) => ({ pos: it.pos, definition: s.definition, ru: s.translations.ru, examples: s.examples, cefr: s.level, register: s.register, source: "vocabulary" as const, senseRef: s.id }));
    e.collocations = [...new Set(it.senses.flatMap((s) => s.collocations))];
    e.synonyms = [...new Set(it.senses.flatMap((s) => s.synonyms))];
    e.forms = it.family.map((f) => `${f.form}${f.pos ? ` (${f.pos})` : ""}`);
    e.cefr = it.senses[0].level; e.register = it.senses[0].register;
    e.vocabSlug = it.slug;
    e.sources = [{ name: "English Mastery dictionary" }];
    return e;
  }
  function fromCore(c: CoreWord, query: string, note?: string): DictEntry {
    const e = emptyEntry(query, c.word);
    e.formNote = c.word.toLowerCase() !== query.toLowerCase() ? note ?? `form of ${c.word}` : undefined;
    e.senses = [{ pos: c.pos, definition: c.definition, ru: c.ru, examples: c.example ? [c.example] : [], source: "core" }];
    if (c.note) e.usageNotes = [c.note];
    e.forms = c.forms;
    if (GROUP_LABEL[c.group]) e.grammar = GROUP_LABEL[c.group];
    e.register = "neutral";
    e.sources = [{ name: c.group === "General vocabulary" ? "English Mastery general dictionary" : "English Mastery core grammar lexicon" }];
    return e;
  }

  /** Exact phrase or word first, then base-form candidates. */
  function lookup(query: string, sentencePos: PosClass | null = null, preferredLemma?: string): DictEntry | null {
    const q = query.toLowerCase().replace(/’/g, "'").trim();
    const cands = [...(preferredLemma ? [{ lemma: preferredLemma.toLowerCase(), note: undefined }] : []), ...lemmaCandidates(q)];
    for (const c of cands) {
      const it = byForm.get(c.lemma);
      if (it) { const e = fromVocab(it, query, c.note ?? noteFor(q, it.lemma)); e.contextIndex = pickContextSense(e.senses, sentencePos); return e; }
      const cw = coreBy.get(c.lemma);
      if (cw) {
        const note = (c.lemma === cw.word.toLowerCase() ? c.note : undefined) ?? noteFor(q, cw.word);
        const e = fromCore(cw, query, note); e.contextIndex = 0; return e;
      }
    }
    return null;
  }
  return { lookup, has: (w: string) => byForm.has(w.toLowerCase()) || coreBy.has(w.toLowerCase()) };
}
