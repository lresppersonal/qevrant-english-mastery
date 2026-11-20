import "server-only";
import { structured, aiConfigured } from "@/lib/ai/server";
import nlp from "compromise";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { vocabItems } from "@/lib/content";
import core from "@content/generated/core-lexicon.json";
import { createLocalDictionary, type CoreWord } from "./local";
import { lemmaCandidates } from "./lemmatize";
import { emptyEntry, pickContextSense, posClass, type DictEntry, type DictSense, type PosClass } from "./types";

/**
 * Hybrid dictionary lookup:
 *   1. English Mastery vocabulary + core grammar lexicon (local, instant)
 *   2. cache (server memory, plus Supabase table when SUPABASE_SERVICE_ROLE_KEY is set)
 *   3. Free Dictionary API (Wiktionary data: IPA, audio, parts of speech, synonyms)
 *   4. Claude: original definitions, Russian, CEFR, register, collocations, meaning in context
 * Steps 3 and 4 back each other up: either one alone still gives a useful entry.
 */

const local = createLocalDictionary(vocabItems, core as CoreWord[]);
const DICT_BASE = process.env.DICTIONARY_API_BASE || "https://api.dictionaryapi.dev/api/v2/entries/en";
export const ttsConfigured = () => !!process.env.GOOGLE_TTS_API_KEY;

export class DictionaryUnavailable extends Error {}

// ---------- context ----------
const TAG_POS: [string, PosClass][] = [["Determiner", "determiner"], ["Pronoun", "pronoun"], ["Preposition", "preposition"], ["Conjunction", "conjunction"], ["Verb", "verb"], ["Modal", "verb"], ["Adverb", "adverb"], ["Adjective", "adjective"], ["Noun", "noun"]];
const GRAMMAR_LABEL: Record<string, string> = {
  Gerund: "-ing form (gerund or present participle)", PastTense: "past tense", Participle: "participle", PresentTense: "present tense", Infinitive: "base form (infinitive)",
  Plural: "plural noun", Singular: "singular noun", Comparative: "comparative", Superlative: "superlative", Possessive: "possessive", Modal: "modal verb", Auxiliary: "auxiliary verb", Copula: "linking verb",
};
export function analyseContext(word: string, sentence: string) {
  try {
    const doc = nlp(sentence || word);
    doc.compute("root");
    const terms = (doc.json({ terms: { root: true } } as never) as { terms: { normal: string; text: string; tags: string[]; root?: string }[] }[]).flatMap((s) => s.terms);
    const w = word.toLowerCase().replace(/’/g, "'");
    const t = terms.find((x) => x.normal === w || x.text.toLowerCase() === w);
    if (!t) return { pos: null as PosClass | null, root: undefined as string | undefined, grammar: undefined as string | undefined };
    const pos = TAG_POS.find(([tag]) => t.tags.includes(tag))?.[1] ?? null;
    const detail = t.tags.map((x) => GRAMMAR_LABEL[x]).filter(Boolean);
    const grammar = [pos, ...detail].filter(Boolean).join(", ");
    return { pos, root: t.root && t.root !== w ? t.root : undefined, grammar: grammar || undefined };
  } catch {
    return { pos: null, root: undefined, grammar: undefined };
  }
}

// ---------- cache ----------
const memory = new Map<string, DictEntry>();
const MEMORY_MAX = 3000;
const admin = () => (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }) : null);
/** Context-free part of an entry, safe to reuse for any sentence. */
const cacheable = (e: DictEntry): DictEntry => ({ ...e, query: e.lemma, formNote: undefined, contextIndex: null, contextNote: undefined, grammar: undefined });

async function cacheGet(key: string): Promise<DictEntry | null> {
  if (memory.has(key)) return memory.get(key)!;
  const sb = admin();
  if (!sb) return null;
  const { data } = await sb.from("dictionary_cache").select("entry").eq("key", key).maybeSingle();
  if (data?.entry) { memory.set(key, data.entry as DictEntry); return data.entry as DictEntry; }
  return null;
}
async function cachePut(key: string, e: DictEntry, source: string) {
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
  memory.set(key, cacheable(e));
  const sb = admin();
  if (sb) await sb.from("dictionary_cache").upsert({ key, entry: cacheable(e), source, updated_at: new Date().toISOString() }).then(() => {}, () => {});
}

// ---------- Free Dictionary API (Wiktionary) ----------
interface FdEntry { word: string; phonetic?: string; phonetics?: { text?: string; audio?: string }[]; meanings: { partOfSpeech: string; definitions: { definition: string; example?: string; synonyms?: string[]; antonyms?: string[] }[]; synonyms?: string[]; antonyms?: string[] }[]; license?: { name: string; url: string }; sourceUrls?: string[] }

async function fetchFd(word: string): Promise<FdEntry[] | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`${DICT_BASE}/${encodeURIComponent(word)}`, { signal: ctl.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new DictionaryUnavailable(`dictionary ${r.status}`);
    return (await r.json()) as FdEntry[];
  } catch (e) {
    if (e instanceof DictionaryUnavailable) throw e;
    throw new DictionaryUnavailable((e as Error).message);
  } finally { clearTimeout(timer); }
}

function phonetics(list: FdEntry[]) {
  const ipa: { uk?: string; us?: string } = {}, audio: { uk?: string; us?: string } = {};
  const all = list.flatMap((e) => [...(e.phonetics ?? []), ...(e.phonetic ? [{ text: e.phonetic }] : [])]);
  for (const p of all) {
    const a = p.audio ?? "";
    const accent = /-(uk|gb)\.(mp3|ogg|wav)$/i.test(a) ? "uk" : /-us\.(mp3|ogg|wav)$/i.test(a) ? "us" : null;
    if (accent && a) { audio[accent] ??= a.startsWith("//") ? `https:${a}` : a; if (p.text) ipa[accent] ??= p.text; }
  }
  const untagged = all.filter((p) => p.text && !p.audio).map((p) => p.text!);
  for (const t of untagged) {
    const looksUs = /oʊ|ɹ|ɚ|ɝ|ɑɹ/.test(t);
    if (looksUs) ipa.us ??= t; else ipa.uk ??= t;
  }
  return { ipa, audio };
}

function fromFd(list: FdEntry[], query: string, lemma: string): DictEntry {
  const e = emptyEntry(query, lemma);
  const { ipa, audio } = phonetics(list);
  e.ipa = ipa; e.audio = audio;
  for (const entry of list) for (const m of entry.meanings) for (const d of m.definitions.slice(0, 3))
    e.senses.push({ pos: m.partOfSpeech, definition: d.definition, examples: d.example ? [d.example] : [], source: "wiktionary" });
  e.senses = e.senses.slice(0, 8);
  e.synonyms = [...new Set(list.flatMap((x) => x.meanings.flatMap((m) => [...(m.synonyms ?? []), ...m.definitions.flatMap((d) => d.synonyms ?? [])])))].slice(0, 8);
  e.antonyms = [...new Set(list.flatMap((x) => x.meanings.flatMap((m) => [...(m.antonyms ?? []), ...m.definitions.flatMap((d) => d.antonyms ?? [])])))].slice(0, 6);
  e.sources = [{ name: "Wiktionary via Free Dictionary API", url: list[0]?.sourceUrls?.[0], license: list[0]?.license?.name ?? "CC BY-SA" }];
  return e;
}

// ---------- AI enrichment ----------
const AiEntry = z.object({
  lemma: z.string().describe("Dictionary base form"),
  formNote: z.string().nullable().describe("If the clicked word is an inflected form, e.g. '-ing form of run'; else null"),
  grammar: z.string().describe("Grammatical function of the word in THIS sentence, e.g. 'determiner (quantifier) before a plural noun'"),
  contextIndex: z.number().int().describe("Index in senses of the meaning used in the sentence"),
  contextNote: z.string().describe("One sentence: what the word means here"),
  senses: z.array(z.object({ pos: z.string(), definition: z.string(), ru: z.string(), example: z.string(), cefr: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]) })).min(1).max(5),
  register: z.enum(["neutral", "formal", "informal", "academic", "spoken"]),
  ipaUk: z.string(), ipaUs: z.string(),
  collocations: z.array(z.string()).max(6), synonyms: z.array(z.string()).max(6), antonyms: z.array(z.string()).max(4),
  forms: z.array(z.string()).max(8).describe("Inflections and word family, e.g. 'run – ran – run', 'runner (noun)'"),
  usageNotes: z.array(z.string()).max(3),
});
export const dictionaryAiConfigured = () => aiConfigured();

async function aiEntry(query: string, sentence: string, lemmaGuess: string, hints: DictSense[]): Promise<z.infer<typeof AiEntry>> {
  return structured(AiEntry, "You are a lexicographer writing a learner's dictionary entry for adult learners of English whose first language is Russian. Write ORIGINAL, concise definitions and examples (do not copy the hint definitions). Order senses from most to least common, but make sure the meaning used in the given sentence is included, and set contextIndex to it. Russian translations must be natural equivalents (1-3 options, separated by commas). For grammar words (articles, determiners, prepositions, conjunctions), explain the grammatical function clearly. IPA in slashes, British (RP) and General American.", `Word clicked: "${query}"\nSentence: "${sentence || query}"\nLikely base form: ${lemmaGuess}\nHint senses from Wiktionary (for reference only): ${hints.slice(0, 6).map((h) => `[${h.pos}] ${h.definition}`).join(" | ") || "none"}`, { maxTokens: 1800, fast: true, timeoutMs: 25_000 });
}

function mergeAi(base: DictEntry, a: z.infer<typeof AiEntry>, keepFdSenses: boolean): DictEntry {
  const e: DictEntry = { ...base, lemma: a.lemma || base.lemma };
  e.senses = a.senses.map((s) => ({ pos: s.pos, definition: s.definition, ru: s.ru, examples: s.example ? [s.example] : [], cefr: s.cefr, register: a.register, source: "ai" as const }));
  if (keepFdSenses) e.senses.push(...base.senses.filter((s) => s.source === "wiktionary").slice(0, 2));
  e.contextIndex = Math.min(Math.max(0, a.contextIndex), a.senses.length - 1);
  e.contextNote = a.contextNote; e.grammar = a.grammar; e.formNote = a.formNote ?? base.formNote;
  e.ipa = { uk: base.ipa.uk ?? a.ipaUk, us: base.ipa.us ?? a.ipaUs };
  e.collocations = a.collocations; e.synonyms = [...new Set([...a.synonyms, ...base.synonyms])].slice(0, 8);
  e.antonyms = [...new Set([...a.antonyms, ...base.antonyms])].slice(0, 6);
  e.forms = a.forms; e.usageNotes = a.usageNotes; e.register = a.register; e.cefr = a.senses[e.contextIndex]?.cefr;
  e.sources = [{ name: "Definitions and translations written by AI (Claude)" }, ...base.sources.map((s) => ({ ...s, name: s.name.startsWith("Wiktionary") ? `${s.name} (pronunciation, synonyms)` : s.name }))];
  e.missing = [];
  return e;
}

// ---------- main entry point ----------
export async function lookupWord(rawQuery: string, sentence: string, opts: { allowAi: boolean } = { allowAi: true }): Promise<DictEntry> {
  const query = rawQuery.trim().slice(0, 60);
  const ctx = analyseContext(query.split(" ")[0], sentence);

  // 1. local dictionary
  const loc = local.lookup(query, ctx.pos, ctx.root);
  if (loc) {
    // Grammar words keep their own label ("determiners and quantifiers"); others use the sentence analysis.
    loc.grammar = loc.grammar ?? ctx.grammar;
    // add pronunciation from the cache or the dictionary API (best effort, never blocks the result for long)
    const ph = await phoneticsFor(loc.lemma).catch(() => null);
    if (ph) { loc.ipa = { uk: loc.ipa.uk ?? ph.ipa.uk, us: loc.ipa.us ?? ph.ipa.us }; loc.audio = ph.audio; if (ph.source) loc.sources.push(ph.source); }
    return loc;
  }

  // 2-4. cache, then external sources
  const lemmaGuess = (ctx.root ?? lemmaCandidates(query)[0]?.lemma ?? query.toLowerCase());
  const keys = [...new Set([lemmaGuess, query.toLowerCase()])];
  for (const k of keys) {
    const hit = await cacheGet(k);
    if (hit) return contextualise({ ...hit, query, senses: [...hit.senses] }, query, ctx);
  }

  let fd: FdEntry[] | null = null; let fdLemma = lemmaGuess; let fdError: Error | null = null;
  try {
    for (const k of [...new Set([lemmaGuess, query.toLowerCase(), ...lemmaCandidates(query).slice(1, 3).map((c) => c.lemma)])]) {
      fd = await fetchFd(k);
      if (fd) { fdLemma = k; break; }
    }
  } catch (e) { fdError = e as Error; }

  const base = fd ? fromFd(fd, query, fdLemma) : emptyEntry(query, lemmaGuess);
  if (dictionaryAiConfigured() && opts.allowAi) {
    try {
      const a = await aiEntry(query, sentence, fdLemma, base.senses);
      const merged = mergeAi(base, a, false);
      if (merged.lemma.toLowerCase() !== query.toLowerCase() && !merged.formNote) merged.formNote = `form of ${merged.lemma}`;
      await cachePut(merged.lemma.toLowerCase(), merged, fd ? "wiktionary+ai" : "ai");
      return merged;
    } catch (e) {
      console.error("dictionary AI failed", (e as Error).message);
      if (!fd) throw new DictionaryUnavailable(fdError?.message ?? "AI unavailable and no dictionary result");
      base.missing.push("Russian translation (the AI service did not respond — try again)");
    }
  } else if (fd) {
    base.missing.push(dictionaryAiConfigured() ? "Russian translation (AI is available after signing in, or with today's limit not yet reached)" : "Russian translation and CEFR level (add ANTHROPIC_API_KEY to enable)");
  }
  if (!fd) {
    if (fdError) throw new DictionaryUnavailable(fdError.message);
    // genuinely not a dictionary word (name, typo, number) and no AI configured
    if (/^\p{Lu}/u.test(query)) {
      base.lemma = query;
      base.senses = [{ pos: "proper noun (name)", definition: "This looks like the name of a person, place, organisation or product, so it has no dictionary meaning of its own. Read the sentence to see who or what it refers to.", ru: "имя собственное (название)", examples: [], source: "core" }];
      base.contextIndex = 0;
      return base;
    }
    base.missing.push("No dictionary entry exists for this form; it may be a typo, a number or a very rare word.");
    return base;
  }
  if (base.lemma.toLowerCase() !== query.toLowerCase()) base.formNote = lemmaCandidates(query).find((c) => c.lemma === base.lemma)?.note ?? `form of ${base.lemma}`;
  await cachePut(base.lemma.toLowerCase(), base, "wiktionary");
  return contextualise(base, query, ctx);
}

function contextualise(e: DictEntry, query: string, ctx: ReturnType<typeof analyseContext>): DictEntry {
  e.grammar = ctx.grammar ?? e.grammar;
  e.contextIndex = pickContextSense(e.senses, ctx.pos);
  if (e.lemma.toLowerCase() !== query.toLowerCase() && !e.formNote) e.formNote = lemmaCandidates(query).find((c) => c.lemma === e.lemma.toLowerCase())?.note ?? `form of ${e.lemma}`;
  return e;
}

/** IPA + audio for a lemma, cached; used to give local entries a pronunciation. */
const phoneCache = new Map<string, { ipa: DictEntry["ipa"]; audio: DictEntry["audio"]; source?: DictEntry["sources"][number] } | null>();
async function phoneticsFor(lemma: string) {
  const k = lemma.toLowerCase();
  if (phoneCache.has(k)) return phoneCache.get(k)!;
  const cached = await cacheGet(k).catch(() => null);
  if (cached && (cached.audio.uk || cached.audio.us || cached.ipa.uk)) { const v = { ipa: cached.ipa, audio: cached.audio, source: undefined as DictEntry["sources"][number] | undefined }; phoneCache.set(k, v); return v; }
  if (k.includes(" ")) { phoneCache.set(k, null); return null; }
  const fd = await fetchFd(k).catch(() => null);
  const v = fd ? { ...phonetics(fd), source: <DictEntry["sources"][number] | undefined>{ name: "Wiktionary via Free Dictionary API (pronunciation)", license: fd[0]?.license?.name ?? "CC BY-SA" } } : null;
  phoneCache.set(k, v);
  return v;
}

/** "Explain in this sentence": a short AI call for cached entries. */
const Explain = z.object({ contextIndex: z.number().int(), contextNote: z.string(), ru: z.string() });
export async function explainInContext(entry: DictEntry, sentence: string) {
  return structured(Explain, "Choose which listed sense of the word is used in the sentence and explain its meaning there in one short sentence for an intermediate learner. Give the best Russian translation for this context.", `Word: ${entry.query} (base form ${entry.lemma})\nSentence: "${sentence}"\nSenses:\n${entry.senses.map((s, i) => `${i}. [${s.pos}] ${s.definition}`).join("\n")}`, { maxTokens: 400, fast: true, timeoutMs: 25_000 });
}

export { posClass };
