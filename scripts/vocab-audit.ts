/**
 * Vocabulary audit: which headwords from the reference books are not yet in our database?
 *
 * Reads plain-text copies of the books from SOURCES_DIR (never committed), extracts ONLY
 * headword + part of speech + unit (facts used for mapping), maps each unit to one of our themes,
 * compares with the compiled database, and writes:
 *   content/audit/vocab-audit.json   per-headword status (in database / missing), sources, theme
 *   content/audit/vocab-audit-summary.json   counts for the report
 * Definitions, examples and exercises from the books are never extracted.
 *
 * Run: SOURCES_DIR=/path/to/texts npx tsx scripts/vocab-audit.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SRC = process.env.SOURCES_DIR;
if (!SRC) { console.error("Set SOURCES_DIR to the folder with the book texts."); process.exit(1); }
const read = (f: string) => fs.readFileSync(path.join(SRC, f), "utf8");

// Unit → theme mapping (editorial; unit topics verified in the Phase 1 audit)
const OUI: Record<number, string> = { 1: "arts-culture", 2: "travel-tourism", 3: "everyday-life", 4: "society-politics", 5: "sports-fitness", 6: "travel-tourism", 7: "nature-wildlife", 8: "crime-law", 9: "work-careers", 10: "relationships-personality", 11: "transport-movement", 12: "health-medicine", 13: "relationships-personality", 14: "business-finance", 15: "food-nutrition", 16: "business-finance" };
const OADV: Record<number, string> = { 1: "cities-urban", 2: "relationships-personality", 3: "arts-culture", 4: "society-politics", 5: "hobbies-leisure", 6: "society-politics", 7: "science-technology", 8: "psychology-behaviour", 9: "work-careers", 10: "health-medicine", 11: "hobbies-leisure", 12: "history-heritage", 13: "communication-media", 14: "economics-globalisation", 15: "architecture-design", 16: "risk-safety" };
const DEST: Record<number, string> = { 2: "education", 4: "science-technology", 6: "work-careers", 8: "transport-movement", 10: "communication-media", 12: "nature-wildlife", 14: "business-finance", 16: "architecture-design", 18: "health-medicine", 20: "society-politics", 22: "arts-culture", 24: "relationships-personality", 26: "hobbies-leisure" };

type Hit = { lemma: string; pos: string; book: string; unit: number; theme: string };
const hits: Hit[] = [];
const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

// ---------- Outcomes Vocabulary Builders: "headword /ipa/ Part of speech"
const POS_RE = "(Noun phrase|Phrasal verb|Plural noun|Uncountable noun|Countable noun|Singular noun|Noun|Verb|Adjective|Adverb|Phrase|Idiom|Binomial|Prefix|Suffix|Collocation|Preposition|Conjunction|Expression)";
function outcomes(file: string, book: string, map: Record<number, string>) {
  let unit = 0;
  for (const raw of read(file).split("\n")) {
    const line = raw.replace(/^Use the Text Notes tool to add\s*/, "").trim();
    const u = line.match(/^Unit (\d+) Vocabulary Builder/);
    if (u) { unit = Number(u[1]); continue; }
    const m = line.match(new RegExp(`^(?:your own notes and translations\\. )?([A-Za-z][A-Za-z ’'(),.-]{0,60}?) /[^/]{2,60}/ *${POS_RE}`));
    if (m && unit && map[unit]) hits.push({ lemma: norm(m[1]), pos: m[2].toLowerCase(), book, unit, theme: map[unit] });
  }
}
outcomes("outcomes-ui.txt", "Outcomes Upper-Int VB", OUI);
outcomes("outcomes-adv.txt", "Outcomes Advanced VB", OADV);

// ---------- Destination C1&C2 reference section: "headword (pos) …" in the topic vocabulary database
{
  const lines = read("destination-c1c2.txt").split("\n").map((l) => l.trim()).filter(Boolean);
  const start = lines.findIndex((l, i) => i > 200 && l === "Topic vocabulary database");
  const end = lines.findIndex((l, i) => i > start && /^Phrasal verbs database$/.test(l));
  let unit = 0;
  for (const l of lines.slice(start, end > 0 ? end : undefined)) {
    const u = l.match(/^Unit (\d+)$/);
    if (u) { unit = Number(u[1]); continue; }
    const m = l.match(/^([a-z][a-z' -]{1,40}?) \((n|v|adj|adv|phr v|phrase|prep|conj|n pl)\)/);
    if (m && DEST[unit]) hits.push({ lemma: norm(m[1]), pos: { n: "noun", v: "verb", adj: "adjective", adv: "adverb", "phr v": "phrasal verb", phrase: "phrase", prep: "preposition", conj: "conjunction", "n pl": "plural noun" }[m[2]]!, book: "Destination C1&C2", unit, theme: DEST[unit] });
  }
}

// ---------- compare with our database
const db = JSON.parse(fs.readFileSync(path.join(ROOT, "content/generated/vocabulary.json"), "utf8")).items as { lemma: string; slug: string }[];
const edu = JSON.parse(fs.readFileSync(path.join(ROOT, "content/vocabulary/education.json"), "utf8")).items as { lemma: string; slug: string; forms?: string[] }[];
const known = new Set<string>();
for (const it of [...db, ...edu]) {
  known.add(norm(it.lemma));
  known.add(norm(it.lemma).replace(/^(the|a|an|to) /, ""));
  for (const f of (it as { forms?: string[] }).forms ?? []) known.add(norm(f));
}
const byLemma = new Map<string, { lemma: string; pos: string[]; sources: string[]; themes: string[]; inDatabase: boolean }>();
for (const h of hits) {
  const e = byLemma.get(h.lemma) ?? { lemma: h.lemma, pos: [], sources: [], themes: [], inDatabase: known.has(h.lemma) };
  if (!e.pos.includes(h.pos)) e.pos.push(h.pos);
  const src = `${h.book} ${h.unit}`;
  if (!e.sources.includes(src)) e.sources.push(src);
  if (!e.themes.includes(h.theme)) e.themes.push(h.theme);
  byLemma.set(h.lemma, e);
}
const rows = [...byLemma.values()].sort((a, b) => a.lemma.localeCompare(b.lemma));
const perBook: Record<string, number> = {};
for (const h of hits) perBook[h.book] = (perBook[h.book] ?? 0) + 1;
const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  headwordOccurrences: hits.length,
  occurrencesPerBook: perBook,
  uniqueHeadwords: rows.length,
  duplicatesAcrossBooks: hits.length - rows.length,
  alreadyInDatabase: rows.filter((r) => r.inDatabase).length,
  missing: rows.filter((r) => !r.inDatabase).length,
  notExtracted: ["Destination B2 (image-only scan, no text)", "Destination C1&C2 phrasal verbs, phrases/collocations, idioms and word-formation databases (layout cannot be split into headword and definition reliably; to be reviewed manually)"],
};
fs.mkdirSync(path.join(ROOT, "content/audit"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "content/audit/vocab-audit.json"), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(ROOT, "content/audit/vocab-audit-summary.json"), JSON.stringify(summary, null, 2));
console.log(summary);
