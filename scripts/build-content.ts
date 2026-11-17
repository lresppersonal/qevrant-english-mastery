/**
 * Content compiler. Editors write compact source files in content/src; this script turns them into
 * validated JSON in content/generated, which the app imports.
 *
 *   content/src/vocabulary/<theme>.txt   one entry per line (see FORMAT below)
 *   content/src/grammar/<slug>.md        theory sections + practice questions
 *   content/src/reading/<slug>.md        passage + IELTS-style tasks + key vocabulary
 *   content/src/writing/*.txt            essay-type guides + essay questions
 *
 * Provenance: if SOURCES_DIR points to plain-text copies of the reference books, every vocabulary
 * headword is checked against them and the result stored in `attestedIn`. The books themselves are
 * never copied into the repository. Without SOURCES_DIR, previous attestations are kept.
 *
 * Run: npx tsx scripts/build-content.ts
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "content/src");
const OUT = path.join(ROOT, "content/generated");
fs.mkdirSync(OUT, { recursive: true });

const META = { status: "published", version: 1, author: "QEVRANT editorial (AI-assisted draft)", reviewer: null, publishedAt: "2026-11-16" };
const kebab = (s: string) => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = (s: string | undefined) => (s ?? "").split(";").map((x) => x.trim()).filter(Boolean);
const read = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !f.startsWith(".")).sort().map((f) => ({ f, text: fs.readFileSync(path.join(dir, f), "utf8") })) : []);
const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

// ================= VOCABULARY =================
/*
FORMAT (one line per entry, fields separated by " | "):
  lemma | class | pos | level | register | subtopic | definition | russian | example | collocations; ... | synonyms; ... | extra themes; ...
  class: n v adj adv coll pv idiom fx   (append "+ac" for academic vocabulary)
  register: neutral formal informal academic spoken
Special lines:
  @family sustain (v); sustainable (adj); sustainability (n)
  @distinct affect vs effect :: explanation
  # comment
*/
const CLASS: Record<string, { lexClass: string; kind: string }> = {
  n: { lexClass: "noun", kind: "word" }, v: { lexClass: "verb", kind: "word" }, adj: { lexClass: "adjective", kind: "word" },
  adv: { lexClass: "adverb", kind: "word" }, coll: { lexClass: "collocation", kind: "collocation" },
  pv: { lexClass: "phrasal_verb", kind: "phrasal_verb" }, idiom: { lexClass: "idiom", kind: "idiom" }, fx: { lexClass: "fixed_expression", kind: "phrase" },
};

const SOURCES_DIR = process.env.SOURCES_DIR;
const SOURCE_FILES: Record<string, string> = {
  "Speakout B2": "speakout-b2.txt", "Speakout C1–C2": "speakout-c1c2.txt", "Outcomes Upper-Int VB": "outcomes-ui.txt",
  "Outcomes Advanced VB": "outcomes-adv.txt", "Destination C1&C2": "destination-c1c2.txt",
};
const sourceText: Record<string, string> = {};
if (SOURCES_DIR) for (const [name, file] of Object.entries(SOURCE_FILES)) {
  const p = path.join(SOURCES_DIR, file);
  if (fs.existsSync(p)) sourceText[name] = " " + fs.readFileSync(p, "utf8").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ") + " ";
}
const previous: Record<string, string[]> = {};
try {
  for (const it of JSON.parse(fs.readFileSync(path.join(OUT, "vocabulary.json"), "utf8")).items) previous[it.slug] = it.attestedIn;
} catch { /* first run */ }

function attest(slug: string, lemma: string) {
  if (!Object.keys(sourceText).length) return previous[slug] ?? [];
  const forms = [lemma.toLowerCase().replace(/^(the|a|an|be|to) /, "").replace(/ (sth|sb|something|someone)\b/g, "").replace(/[()]/g, "")];
  return Object.entries(sourceText)
    .filter(([, t]) => forms.some((f) => new RegExp(`[^a-z]${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ -]")}[^a-z]`).test(t)))
    .map(([n]) => n);
}

const vocab: Record<string, unknown>[] = [];
const families: { theme: string; members: { form: string; pos: string }[] }[] = [];
const distinctions: { theme: string; title: string; text: string }[] = [];
const seenSlug = new Map<string, string>();

for (const { f, text } of read(path.join(SRC, "vocabulary"))) {
  const theme = f.replace(/\.txt$/, "");
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const where = `vocabulary/${f}:${i + 1}`;
    if (!line || line.startsWith("#")) return;
    if (line.startsWith("@family ")) {
      families.push({ theme, members: line.slice(8).split(";").map((m) => { const mm = m.trim().match(/^(.+?)\s*\(([^)]+)\)$/); return mm ? { form: mm[1], pos: mm[2] } : { form: m.trim(), pos: "" }; }) });
      return;
    }
    if (line.startsWith("@distinct ")) {
      const [title, body] = line.slice(10).split("::").map((x) => x.trim());
      if (!body) fail(where, "distinction needs 'title :: explanation'");
      distinctions.push({ theme, title, text: body });
      return;
    }
    const p = line.split("|").map((x) => x.trim());
    if (p.length < 9) return fail(where, `expected at least 9 fields, got ${p.length}`);
    const [lemma, cls, pos, level, register, subtopic, definition, ru, example, colls, syns, extra] = p;
    const [code, ac] = cls.split("+");
    if (!CLASS[code]) return fail(where, `unknown class "${cls}"`);
    const slug = kebab(lemma);
    if (seenSlug.has(slug)) return fail(where, `duplicate entry "${lemma}" (already in ${seenSlug.get(slug)}); add the theme as a tag instead`);
    seenSlug.set(slug, f);
    vocab.push({
      ...META, id: "", slug, lemma, kind: CLASS[code].kind, lexClass: CLASS[code].lexClass, pos, subtopic, family: [], forms: [], sources: [],
      attestedIn: attest(slug, lemma),
      senses: [{ id: slug, level, register, academic: ac === "ac" || register === "academic", definition, examples: [example],
        collocations: list(colls), synonyms: list(syns), translations: { ru }, topics: [theme, ...list(extra)] }],
    });
  });
}

// ================= GRAMMAR (theory + practice) =================
/*
---
slug: ... | title: ... | level: B2 | domain: ... | minutes: 30 | summary: ...
links: extends>slug>Label>C1>published|planned ; ...
sources: Speakout B2 1A ; Destination C1&C2 Unit 1
---
## section-id | kind | Title
Paragraph text.
- list item
> ex: example sentence || optional note
> x: wrong sentence || correction note
| Head | Head |
| cell | cell |
!tip text   !warning text   !register text
=== practice
### [mc|gap|transform|error|complete|rewrite|context] @section-id LEVEL
Prompt (use ___ for gaps)
- wrong option
+ right option
= accepted answer | alternative          (typed formats)
> Explanation
*/
type Block = Record<string, unknown>;
function parseFront(text: string, where: string) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) { fail(where, "missing front matter"); return { meta: {} as Record<string, string>, body: text }; }
  const meta: Record<string, string> = {};
  for (const l of m[1].split("\n")) { const i = l.indexOf(":"); if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }
  return { meta, body: text.slice(m[0].length) };
}
function parseBlocks(lines: string[], where: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; } };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) { flush(); continue; }
    if (l.startsWith("+++ ")) {
      flush();
      const title = l.slice(4).trim(); const inner: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "+++") inner.push(lines[i++]);
      if (i >= lines.length) fail(where, `details "${title}" is not closed with +++`);
      blocks.push({ type: "details", title, blocks: parseBlocks(inner, `${where} › ${title}`) } as Block); continue;
    }
    if (l.startsWith("#### ")) { flush(); blocks.push({ type: "h3", text: l.slice(5).trim() }); continue; }
    if (l.startsWith("!rule ")) { flush(); blocks.push({ type: "rule", text: l.slice(6).trim() }); continue; }
    if (l.startsWith("- ")) {
      flush();
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) items.push(lines[i++].trim().slice(2));
      i--; blocks.push({ type: "list", items }); continue;
    }
    if (/^> (ex|x):/.test(l)) {
      flush();
      const items: Record<string, unknown>[] = [];
      while (i < lines.length && /^> (ex|x):/.test(lines[i].trim())) {
        const t = lines[i++].trim();
        const wrong = t.startsWith("> x:");
        const [en, note] = t.replace(/^> (ex|x):\s*/, "").split("||").map((x) => x.trim());
        items.push({ en: wrong ? `~~${en}~~` : en, ...(note ? { note } : {}), ...(wrong ? { wrong: true } : {}) });
      }
      i--; blocks.push({ type: "examples", items }); continue;
    }
    if (l.startsWith("|")) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      i--; blocks.push({ type: "table", head: rows[0], rows: rows.slice(1) }); continue;
    }
    const note = l.match(/^!(tip|warning|register)\s+(.*)$/);
    if (note) { flush(); blocks.push({ type: "note", tone: note[1], text: note[2] }); continue; }
    para.push(l);
  }
  flush();
  if (!blocks.length) fail(where, "empty section");
  return blocks;
}

const FORMAT_NAME: Record<string, string> = { mc: "Multiple choice", gap: "Gap fill", transform: "Sentence transformation", error: "Error correction", complete: "Sentence completion", rewrite: "Rewriting", context: "In context" };
function parsePractice(text: string, lessonSlug: string, where: string) {
  const qs: Record<string, unknown>[] = [];
  const chunks = text.split(/^### /m).slice(1);
  chunks.forEach((chunk, n) => {
    const [head, ...rest] = chunk.split("\n");
    const hm = head.match(/^\[(\w+)\]\s+@([\w-]+)(?:\s+(B2\+?|C1|C2))?/);
    if (!hm) return fail(where, `bad question header "${head}"`);
    const [, fmt, section, level] = hm;
    const prompt: string[] = []; const opts: { t: string; ok: boolean }[] = []; const accepted: string[] = []; let expl = "";
    for (const l of rest.map((x) => x.trim()).filter(Boolean)) {
      if (l.startsWith("- ")) opts.push({ t: l.slice(2), ok: false });
      else if (l.startsWith("+ ")) opts.push({ t: l.slice(2), ok: true });
      else if (l.startsWith("= ")) accepted.push(...l.slice(2).split("|").map((x) => x.trim()).filter(Boolean));
      else if (l.startsWith("> ")) expl += (expl ? " " : "") + l.slice(2);
      else prompt.push(l);
    }
    const base = { id: `q${n + 1}`, format: FORMAT_NAME[fmt] ?? fmt, ...(level ? { level } : {}), prompt: prompt.join(" "), explanation: expl, errorTag: `${lessonSlug}:${section}`, theoryAnchor: { lesson: lessonSlug, section } };
    if (!expl) fail(where, `q${n + 1} has no explanation`);
    if (opts.length) {
      const answer = opts.findIndex((o) => o.ok);
      if (answer < 0 || opts.filter((o) => o.ok).length > 1) fail(where, `q${n + 1} needs exactly one + option`);
      qs.push({ kind: "choice", ...base, options: opts.map((o) => o.t), answer });
    } else {
      if (!accepted.length) fail(where, `q${n + 1} has neither options nor = answers`);
      qs.push({ kind: "text", ...base, accepted });
    }
  });
  return qs;
}

const lessons: Record<string, unknown>[] = [];
const exercises: Record<string, unknown>[] = [];
for (const { f, text } of read(path.join(SRC, "grammar"))) {
  const where = `grammar/${f}`;
  const { meta, body } = parseFront(text, where);
  const [theoryText, practiceText = ""] = body.split(/^=== practice\s*$/m);
  const sections = theoryText.split(/^## /m).slice(1).map((chunk) => {
    const [head, ...rest] = chunk.split("\n");
    const [id, kind, title] = head.split("|").map((x) => x.trim());
    return { id, kind, title, blocks: parseBlocks(rest, `${where}#${id}`) };
  });
  const links = list(meta.links).map((l) => { const [type, to, label, level, pub] = l.split(">").map((x) => x.trim()); return { type, to, label, level, published: pub === "published" }; });
  const sources = list(meta.sources).map((s) => { const m = s.match(/^(.*?)\s+(Unit\s+\d+|\d+[A-D]?)\s*$/); return { book: m ? m[1] : s, unit: m ? m[2].replace("Unit ", "") : "-", confidence: "verified" }; });
  const practiceSlug = `${meta.slug}-practice`;
  const questions = parsePractice(practiceText, meta.slug, where);
  lessons.push({ ...META, id: "", slug: meta.slug, title: meta.title, level: meta.level, domain: meta.domain, topics: list(meta.topics).length ? list(meta.topics) : ["education"], summary: meta.summary, minutes: Number(meta.minutes || 25), sections, links, exercises: [practiceSlug], sources });
  exercises.push({ ...META, id: "", slug: practiceSlug, title: `${meta.title}: practice`, skill: "grammar", format: "mixed", level: meta.level, topics: [], target: { type: "lesson", ref: meta.slug }, instructions: "Mixed practice from B2 to C2. Every explanation links back to the rule it practises.", questions });
}

// ================= READING =================
/*
---
slug | title | category (theme) | level | minutes | standfirst
---
[A] Paragraph...
=== vocab
term | definition | russian | sense-id (optional)
=== expressions
phrase | meaning
=== task tfng | instructions        Q statement :: T|F|NG :: explanation
=== task mc | instructions          ### prompt / - opt / + right / > explanation
=== task headings | instructions    @options i. Heading; ii. Heading ...   Q Paragraph B :: iii :: explanation
=== task info | instructions        Q statement :: C :: explanation        (options = paragraph letters)
=== task sentence|summary|short | instructions   Q prompt with ___ :: answer|alt :: explanation
=== critical
Q question :: points to consider
*/
const TASK_FORMAT: Record<string, string> = { tfng: "tfng", mc: "multiple_choice", headings: "matching_headings", info: "matching_information", sentence: "sentence_completion", summary: "summary_completion", short: "short_answer" };
const TASK_TITLE: Record<string, string> = { tfng: "True / False / Not given", mc: "Multiple choice", headings: "Matching headings", info: "Matching information", sentence: "Sentence completion", summary: "Summary completion", short: "Short-answer questions" };
const readings: Record<string, unknown>[] = [];
for (const { f, text } of read(path.join(SRC, "reading"))) {
  const where = `reading/${f}`;
  const { meta, body } = parseFront(text, where);
  const [passage, ...parts] = body.split(/^=== /m);
  const paragraphs = passage.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const letters = paragraphs.map((p, i) => { const m = p.match(/^\[([A-Z])\]/); if (!m) fail(where, `paragraph ${i + 1} needs a [A] label`); return m?.[1] ?? "?"; });
  const keyVocabulary: unknown[] = []; const expressions: unknown[] = []; const critical: unknown[] = []; const exSlugs: string[] = [];
  let taskN = 0;
  for (const part of parts) {
    const [head, ...lines] = part.split("\n");
    const body2 = lines.map((l) => l.trim()).filter(Boolean);
    if (head.startsWith("vocab")) { for (const l of body2) { const [term, definition, ru, sense] = l.split("|").map((x) => x.trim()); keyVocabulary.push({ term, definition, ru, ...(sense ? { sense } : {}) }); } continue; }
    if (head.startsWith("expressions")) { for (const l of body2) { const [phrase, meaning] = l.split("|").map((x) => x.trim()); expressions.push({ phrase, meaning }); } continue; }
    if (head.startsWith("critical")) { for (const l of body2.filter((x) => x.startsWith("Q "))) { const [question, points] = l.slice(2).split("::").map((x) => x.trim()); critical.push({ question, points }); } continue; }
    const tm = head.match(/^task (\w+)\s*\|\s*(.*)$/);
    if (!tm) { fail(where, `unknown block "${head}"`); continue; }
    const [, kind, instructions] = tm;
    taskN++;
    const slug = `${meta.slug}-${taskN}`;
    exSlugs.push(slug);
    const questions: Record<string, unknown>[] = [];
    if (kind === "mc") {
      questions.push(...parsePractice(lines.join("\n").replace(/^### (.*)$/gm, "### [mc] @x\n$1"), meta.slug, where).map((q) => { const { theoryAnchor: _a, errorTag: _e, format: _f, ...rest } = q as Record<string, unknown>; return { ...rest, theoryAnchor: null }; }));
    } else {
      let options: string[] = [];
      const opt = body2.find((l) => l.startsWith("@options "));
      if (kind === "tfng") options = ["True", "False", "Not given"];
      if (kind === "info") options = letters.map((l) => `Paragraph ${l}`);
      if (kind === "headings") options = (opt ?? "").slice(9).split(";").map((x) => x.trim()).filter(Boolean);
      body2.filter((l) => l.startsWith("Q ")).forEach((l, n) => {
        const [prompt, ans, explanation] = l.slice(2).split("::").map((x) => x.trim());
        const id = `q${n + 1}`;
        if (!explanation) fail(where, `${slug}/${id} needs an explanation`);
        if (["tfng", "info", "headings"].includes(kind)) {
          let answer = -1;
          if (kind === "tfng") answer = { T: 0, F: 1, NG: 2 }[ans as "T" | "F" | "NG"] ?? -1;
          if (kind === "info") answer = letters.indexOf(ans);
          if (kind === "headings") answer = options.findIndex((o) => o.split(".")[0].trim() === ans);
          if (answer < 0) fail(where, `${slug}/${id}: answer "${ans}" not among options`);
          questions.push({ kind: "choice", id, prompt, options, answer, explanation, theoryAnchor: null });
        } else {
          questions.push({ kind: "text", id, prompt, accepted: ans.split("|").map((x) => x.trim()), explanation, theoryAnchor: null });
        }
      });
    }
    exercises.push({ ...META, id: "", slug, title: TASK_TITLE[kind] ?? kind, skill: "reading", format: TASK_FORMAT[kind] ?? "multiple_choice", level: meta.level, topics: [meta.category], target: { type: "text", ref: meta.slug }, passageRef: meta.slug, instructions, questions });
  }
  readings.push({ ...META, id: "", slug: meta.slug, title: meta.title, standfirst: meta.standfirst, level: meta.level, topics: [meta.category], category: meta.category, minutes: Number(meta.minutes || 6), paragraphs, exercises: exSlugs, keyVocabulary, expressions, critical, origin: "original" });
}

// ================= WRITING =================
/*
== type: opinion
@title Opinion essays
@recognise To what extent do you agree or disagree? / Do you agree or disagree?
@structure Introduction: ... ; Body 1: ... ; ...
@linking In my view; ...
Q theme1,theme2 | level | Title | question | plan step; step | vocabulary; ... | collocations; ... | idea; idea
*/
const guides: Record<string, unknown>[] = [];
const prompts: Record<string, unknown>[] = [];
const GENRE_GUIDANCE: Record<string, string[]> = {
  opinion: ["State your position clearly in the introduction and keep it consistent.", "Give each body paragraph one main reason, explained and supported with an example.", "Acknowledge an opposing view briefly and show why yours is stronger.", "Conclude by restating your answer to the exact question."],
  discussion: ["Present BOTH views fairly in separate paragraphs.", "Make your own opinion explicit (introduction and conclusion).", "Avoid simply listing arguments: explain why each one matters.", "Keep your opinion consistent with the paragraph you weight most."],
  advantages_disadvantages: ["Cover both advantages and disadvantages.", "If asked whether one outweighs the other, give a clear verdict.", "Weigh the points: who benefits, who loses, in the short and long term?", "Support each point with a specific consequence or example."],
  problem_solution: ["Identify two or three specific problems, not vague ones.", "Match each solution to a problem.", "Say who should act (governments, companies, individuals).", "Consider whether solutions are realistic."],
  two_part: ["Answer BOTH questions; give each its own paragraph.", "Answer each question directly in its topic sentence.", "Develop answers with explanation and examples.", "Your conclusion should summarise both answers."],
  positive_negative: ["Decide whether the development is mainly positive or negative and say so.", "Discuss both sides, giving more weight to your view.", "Think about different groups affected.", "End with a clear judgement."],
  cause_effect: ["Explain the causes in one part and the effects in another.", "Link causes to effects logically.", "Use cause-and-effect language precisely (leads to, stems from, as a result).", "Prioritise the most significant causes and effects."],
  cause_problem_solution: ["Explain why the situation has arisen.", "Describe the problems it creates.", "Propose solutions linked to the causes you identified.", "Keep each paragraph focused on one function."],
};
for (const { f, text } of read(path.join(SRC, "writing"))) {
  let type = "";
  const where = `writing/${f}`;
  text.split("\n").forEach((raw, i) => {
    const l = raw.trim();
    if (!l || l.startsWith("#")) return;
    const tm = l.match(/^== type:\s*(\w+)/);
    if (tm) { type = tm[1]; guides.push({ type, title: "", recognise: "", structure: [], linking: [] }); return; }
    const g = guides[guides.length - 1] as Record<string, unknown>;
    if (l.startsWith("@title ")) { g.title = l.slice(7); return; }
    if (l.startsWith("@recognise ")) { g.recognise = l.slice(11); return; }
    if (l.startsWith("@structure ")) { g.structure = list(l.slice(11)); return; }
    if (l.startsWith("@linking ")) { g.linking = list(l.slice(9)); return; }
    if (l.startsWith("Q ")) {
      const p = l.slice(2).split(" | ").map((x) => x.trim());
      if (p.length < 8) return fail(`${where}:${i + 1}`, `essay needs 8 fields, got ${p.length}`);
      const [themes, level, title, prompt, plan, vocabulary, collocations, ideas] = p;
      prompts.push({ ...META, slug: kebab(title), title, level, topics: themes.split(",").map((x) => x.trim()), genre: type, prompt, minWords: 250, suggestedMinutes: 40,
        guidance: GENRE_GUIDANCE[type] ?? [], usefulLanguage: [], plan: list(plan), vocabulary: list(vocabulary), collocations: list(collocations), ideas: list(ideas) });
    }
  });
}

// ---------- Speaking topic bank (random generator) ----------
const speakingCategories: { slug: string; title: string }[] = [];
const speakingBank: { id: string; category: string; level: string; prompt: string; points: string[] }[] = [];
{
  const f = path.join(SRC, "speaking", "bank.txt");
  if (fs.existsSync(f)) {
    let cat = "";
    const seen = new Set<string>();
    fs.readFileSync(f, "utf8").split("\n").forEach((line, n) => {
      const l = line.trim();
      if (!l || l.startsWith("# ")) return;
      const h = l.match(/^## ([a-z-]+) \| (.+)$/);
      if (h) { cat = h[1]; speakingCategories.push({ slug: h[1], title: h[2] }); return; }
      const [level, prompt, pts] = l.split("|").map((x) => x.trim());
      if (!cat || !/^(B2\+?|C1|C2)$/.test(level) || !prompt || !pts) return fail(`speaking/bank.txt:${n + 1}`, "expected: level | prompt | point; point");
      const id = `${cat}-${crypto.createHash("sha1").update(prompt).digest("hex").slice(0, 8)}`;
      if (seen.has(id)) return fail(`speaking/bank.txt:${n + 1}`, "duplicate prompt");
      seen.add(id);
      speakingBank.push({ id, category: cat, level, prompt, points: pts.split(";").map((x) => x.trim()).filter(Boolean) });
    });
  }
}

// ---------- Core lexicon (grammar words, common verbs, expressions) ----------
const coreLexicon: { word: string; pos: string; ru: string; definition: string; example: string; note: string; forms: string[]; group: string }[] = [];
{
  const f = path.join(SRC, "dictionary", "core.txt");
  if (fs.existsSync(f)) {
    let group = "";
    const seen = new Set<string>();
    fs.readFileSync(f, "utf8").split("\n").forEach((line, n) => {
      const l = line.trim();
      if (!l || l.startsWith("# ")) return;
      if (l.startsWith("## ")) { group = l.slice(3).trim(); return; }
      const p = l.split("|").map((x) => x.trim());
      if (p.length < 7 || !p[0] || !p[1] || !p[2] || !p[3]) return fail(`dictionary/core.txt:${n + 1}`, "expected 7 fields: word | pos | ru | definition | example | note | forms");
      const key = p[0].toLowerCase();
      if (seen.has(key)) return fail(`dictionary/core.txt:${n + 1}`, `duplicate "${p[0]}"`);
      seen.add(key);
      coreLexicon.push({ word: p[0], pos: p[1], ru: p[2], definition: p[3], example: p[4], note: p[5], forms: p[6].split(";").map((x) => x.trim()).filter(Boolean), group });
    });
  }
  const g = path.join(SRC, "dictionary", "general.txt");
  if (fs.existsSync(g)) {
    const coreWords = new Set(coreLexicon.map((c) => c.word.toLowerCase()));
    const seen = new Set<string>();
    fs.readFileSync(g, "utf8").split("\n").forEach((line, n) => {
      const l = line.trim();
      if (!l || l.startsWith("#")) return;
      const p = l.split("|").map((x) => x.trim());
      if (p.length !== 4 || p.some((x) => !x)) return fail(`dictionary/general.txt:${n + 1}`, "expected: word | pos | ru | definition");
      const key = p[0].toLowerCase();
      if (seen.has(key)) return fail(`dictionary/general.txt:${n + 1}`, `duplicate "${p[0]}"`);
      seen.add(key);
      if (coreWords.has(key)) return;
      coreLexicon.push({ word: p[0], pos: p[1], ru: p[2], definition: p[3], example: "", note: "", forms: [], group: "General vocabulary" });
    });
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} content error(s):\n` + errors.map((e) => `  ${e}`).join("\n"));
  process.exit(1);
}
const write = (name: string, data: unknown) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 1) + "\n");
write("vocabulary.json", { items: vocab, families, distinctions });
write("lessons.json", lessons);
write("exercises.json", exercises);
write("readings.json", readings);
write("writing.json", { guides, prompts });
write("speaking-bank.json", { categories: speakingCategories, prompts: speakingBank });
write("core-lexicon.json", coreLexicon);
const attested = vocab.filter((v) => (v.attestedIn as string[]).length).length;
console.log(`✓ vocabulary ${vocab.length} entries (${attested} attested in reference books${Object.keys(sourceText).length ? "" : ", kept from previous run"}), ${families.length} word families, ${distinctions.length} distinctions`);
console.log(`✓ grammar ${lessons.length} lessons, ${exercises.filter((e) => e.skill === "grammar").reduce((n, e) => n + (e.questions as unknown[]).length, 0)} practice questions`);
console.log(`✓ reading ${readings.length} texts, ${exercises.filter((e) => e.skill === "reading").reduce((n, e) => n + (e.questions as unknown[]).length, 0)} questions`);
console.log(`✓ writing ${guides.length} essay types, ${prompts.length} questions`);
console.log(`✓ core lexicon ${coreLexicon.filter((c) => c.group !== "General vocabulary").length} grammar words and expressions + ${coreLexicon.filter((c) => c.group === "General vocabulary").length} general words`);
console.log(`✓ speaking bank ${speakingBank.length} prompts in ${speakingCategories.length} categories`);
