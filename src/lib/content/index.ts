import { z } from "zod";
import {
  Theme, GrammarDomain, GrammarLesson, VocabItem, Exercise, ReadingText, SpeakingPrompt, WritingPrompt, EssayTypeGuide,
  type Sense, type Level,
} from "./schema";

import themesJson from "@content/themes.json";
import genVocab from "@content/generated/vocabulary.json";
import genLessons from "@content/generated/lessons.json";
import genExercises from "@content/generated/exercises.json";
import genReadings from "@content/generated/readings.json";
import genWriting from "@content/generated/writing.json";
import domainsJson from "@content/grammar/domains.json";
import relLesson from "@content/grammar/lessons/relative-clauses.json";
import nomLesson from "@content/grammar/lessons/nominal-relative-clauses.json";
import eduVocab from "@content/vocabulary/education.json";
import ex1 from "@content/exercises/relative-clauses-practice.json";
import ex2 from "@content/exercises/nominal-relatives-practice.json";
import ex3 from "@content/exercises/education-collocations.json";
import ex4 from "@content/exercises/failure-reading-tfng.json";
import reading1 from "@content/reading/is-failure-the-best-teacher.json";
import speakingEdu from "@content/speaking/education.json";
import writingEdu from "@content/writing/education.json";

/** Deterministic UUID (v5-shaped) from a slug, so vocabulary ids never change between builds. */
function stableUuid(ns: string, slug: string) {
  // FNV-1a based 128-bit hash; good enough for stable IDs (not security).
  const parts: string[] = [];
  for (let k = 0; k < 4; k++) {
    let h = 0x811c9dc5 ^ (k * 0x9e3779b9);
    for (const ch of `${ns}:${slug}:${k}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    parts.push(h.toString(16).padStart(8, "0"));
  }
  const hex = parts.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function vocabFile(raw: { defaults: Record<string, unknown>; items: Record<string, unknown>[] }) {
  return raw.items.map((it) =>
    VocabItem.parse({ ...raw.defaults, id: stableUuid("vocab", String(it.slug)), sources: [], ...it }),
  );
}

const withId = <T extends { slug: string; id?: string }>(ns: string, x: T) => ({ ...x, id: x.id || stableUuid(ns, x.slug) });

export const themes = z.array(Theme).parse(themesJson);
/** kept for older imports: topics are themes */
export const topics = themes;
export const grammarDomains = z.array(GrammarDomain).parse(domainsJson);
export const grammarLessons = [relLesson, nomLesson, ...(genLessons as { slug: string }[])].map((l) => GrammarLesson.parse(withId("lesson", l)));
export const vocabItems = [
  ...vocabFile(eduVocab as never),
  ...(genVocab.items as { slug: string }[]).map((v) => VocabItem.parse(withId("vocab", v))),
];
export const wordFamilies = genVocab.families as { theme: string; members: { form: string; pos: string }[] }[];
export const distinctions = genVocab.distinctions as { theme: string; title: string; text: string }[];
export const exercises = [ex1, ex2, ex3, ex4, ...(genExercises as { slug: string }[])].map((e) => Exercise.parse(withId("exercise", e)));
export const readingTexts = [reading1, ...(genReadings as { slug: string }[])].map((r) => ReadingText.parse(withId("reading", r)));
export const speakingPrompts = z.array(SpeakingPrompt).parse(speakingEdu);
export const writingPrompts = z.array(WritingPrompt).parse([...writingEdu, ...genWriting.prompts]);
export const essayGuides = z.array(EssayTypeGuide).parse(genWriting.guides);

// ---------- lookups ----------
export const getLesson = (slug: string) => grammarLessons.find((l) => l.slug === slug);
export const getExercise = (slug: string) => exercises.find((e) => e.slug === slug);
export const getReading = (slug: string) => readingTexts.find((r) => r.slug === slug);
export const getTopic = (slug: string) => themes.find((t) => t.slug === slug);
export const getTheme = getTopic;
export const getEssayGuide = (type: string) => essayGuides.find((g) => g.type === type);
export const getVocabItem = (slug: string) => vocabItems.find((v) => v.slug === slug);
export const getSpeakingPrompt = (slug: string) => speakingPrompts.find((p) => p.slug === slug);
export const getWritingPrompt = (slug: string) => writingPrompts.find((p) => p.slug === slug);

export type SenseRef = { item: VocabItem; sense: Sense };
const senseIndex = new Map<string, SenseRef>();
for (const item of vocabItems) for (const sense of item.senses) senseIndex.set(sense.id, { item, sense });
export const getSense = (id: string) => senseIndex.get(id);
export const allSenses = () => [...senseIndex.values()];

/** Surface form → item slug, longest forms first, for tap-to-define in reading. */
export function buildFormIndex() {
  const map: Record<string, string> = {};
  for (const item of vocabItems) for (const f of [item.lemma, ...item.forms]) map[f.toLowerCase()] = item.slug;
  return map;
}

import { LEX_CLASSES, type LexClass } from "@/lib/lexclass";
export { LEX_CLASSES };
export type { LexClass };

/** Lexical class of an item: explicit for compiled entries, derived for older hand-written ones. */
export function lexClassOf(item: VocabItem): LexClass {
  if (item.lexClass) return item.lexClass;
  if (item.kind === "phrasal_verb") return "phrasal_verb";
  if (item.kind === "idiom") return "idiom";
  if (item.kind === "collocation") return "collocation";
  if (item.kind === "phrase") return "fixed_expression";
  const pos = item.pos.toLowerCase();
  if (pos.startsWith("adj")) return "adjective";
  if (pos.startsWith("adv")) return "adverb";
  if (pos.startsWith("verb")) return "verb";
  return "noun";
}

/** Items tagged with a theme (primary or secondary). */
export const itemsInTheme = (theme: string) => vocabItems.filter((v) => v.senses.some((s) => s.topics.includes(theme)));
export const primaryTheme = (item: VocabItem) => item.senses[0].topics[0];

export const LEVEL_ORDER: Level[] = ["B2", "B2+", "C1", "C2"];
export const levelRank = (l: Level) => LEVEL_ORDER.indexOf(l);

/** Cross-reference checks the type system cannot express. Returns a list of problems. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  const lessonSlugs = new Set(grammarLessons.map((l) => l.slug));
  const exerciseSlugs = new Set(exercises.map((e) => e.slug));
  const readingSlugs = new Set(readingTexts.map((r) => r.slug));
  const topicSlugs = new Set(themes.map((t) => t.slug));
  const ids = new Set<string>();

  const checkTopics = (where: string, list: string[]) =>
    list.forEach((t) => !topicSlugs.has(t) && problems.push(`${where}: unknown topic "${t}"`));

  for (const l of grammarLessons) {
    if (ids.has(l.id)) problems.push(`duplicate id ${l.id}`);
    ids.add(l.id);
    checkTopics(`lesson ${l.slug}`, l.topics);
    const sectionIds = l.sections.map((s) => s.id);
    if (new Set(sectionIds).size !== sectionIds.length) problems.push(`lesson ${l.slug}: duplicate section ids`);
    l.exercises.forEach((e) => !exerciseSlugs.has(e) && problems.push(`lesson ${l.slug}: missing exercise ${e}`));
    for (const link of l.links) {
      if (!link.published) continue;
      if (!lessonSlugs.has(link.to) && !readingSlugs.has(link.to)) problems.push(`lesson ${l.slug}: published link to unknown "${link.to}"`);
    }
  }
  for (const d of grammarDomains)
    for (const t of d.topics) if (t.lesson && !lessonSlugs.has(t.lesson)) problems.push(`domain ${d.key}: missing lesson ${t.lesson}`);

  const seenSense = new Set<string>();
  for (const v of vocabItems) {
    checkTopics(`vocab ${v.slug}`, v.senses.flatMap((s) => s.topics));
    for (const s of v.senses) {
      if (seenSense.has(s.id)) problems.push(`duplicate sense id ${s.id}`);
      seenSense.add(s.id);
      if (!s.translations.ru?.trim()) problems.push(`sense ${s.id}: missing Russian translation`);
    }
  }
  if (new Set(vocabItems.map((v) => v.slug)).size !== vocabItems.length) problems.push("duplicate vocab slug");

  for (const e of exercises) {
    if (ids.has(e.id)) problems.push(`duplicate id ${e.id}`);
    ids.add(e.id);
    if (e.target.type === "lesson" && !lessonSlugs.has(e.target.ref)) problems.push(`exercise ${e.slug}: unknown lesson target`);
    if (e.target.type === "text" && !readingSlugs.has(e.target.ref)) problems.push(`exercise ${e.slug}: unknown text target`);
    const qids = e.questions.map((q) => q.id);
    if (new Set(qids).size !== qids.length) problems.push(`exercise ${e.slug}: duplicate question ids`);
    for (const q of e.questions) {
      if (q.kind === "choice" && q.answer >= q.options.length) problems.push(`${e.slug}/${q.id}: answer index out of range`);
      if (q.theoryAnchor) {
        const lesson = getLesson(q.theoryAnchor.lesson);
        if (!lesson) problems.push(`${e.slug}/${q.id}: anchor lesson missing`);
        else if (!lesson.sections.some((s) => s.id === q.theoryAnchor!.section))
          problems.push(`${e.slug}/${q.id}: anchor section "${q.theoryAnchor.section}" missing`);
      } else if (e.skill === "grammar") problems.push(`${e.slug}/${q.id}: grammar question without theory anchor`);
      if (q.targetSense && !getSense(q.targetSense)) problems.push(`${e.slug}/${q.id}: unknown sense ${q.targetSense}`);
    }
  }
  const dup = (what: string, xs: string[]) => { const seen = new Set<string>(); for (const x of xs) { if (seen.has(x)) problems.push(`duplicate ${what} slug ${x}`); seen.add(x); } };
  dup("lesson", grammarLessons.map((l) => l.slug));
  dup("exercise", exercises.map((e) => e.slug));
  dup("reading", readingTexts.map((r) => r.slug));
  dup("writing", writingPrompts.map((p) => p.slug));
  for (const r of readingTexts) {
    if (r.category && !topicSlugs.has(r.category)) problems.push(`reading ${r.slug}: unknown category ${r.category}`);
    r.keyVocabulary.forEach((k) => k.sense && !getSense(k.sense) && problems.push(`reading ${r.slug}: unknown sense ${k.sense}`));
  }
  for (const p of writingPrompts) checkTopics(`writing ${p.slug}`, p.topics);
  for (const g of essayGuides) if (!writingPrompts.some((p) => p.genre === g.type)) problems.push(`essay type ${g.type} has no questions`);
  for (const r of readingTexts) r.exercises.forEach((x) => !exerciseSlugs.has(x) && problems.push(`reading ${r.slug}: missing exercise ${x}`));
  for (const p of [...speakingPrompts, ...writingPrompts])
    p.usefulLanguage.forEach((s) => !getSense(s) && problems.push(`prompt ${p.slug}: unknown sense ${s}`));

  return problems;
}

/** The rule to remember for a lesson section: its first rule box, or else its first paragraph. */
/**
 * Short "rule to remember" for a lesson section, taken from the lesson's own theory (never invented):
 * the section's rule box if it has one, otherwise its first paragraph, note, list items, table rows or example.
 */
export function ruleSummary(lesson: string, section?: string): string | null {
  const l = getLesson(lesson);
  if (!l) return null;
  const sections = section ? l.sections.filter((s) => s.id === section) : l.sections;
  // Cut at whole sentences so inline markup (*italic*, ~~wrong~~) is never left half-open.
  const clip = (t: string, n = 260) => {
    if (t.length <= n) return t;
    const sentences = t.split(/(?<=[.!?])\s+/);
    let out = sentences[0];
    for (const x of sentences.slice(1)) { if ((out + " " + x).length > n) break; out += " " + x; }
    return out.length <= n * 1.4 ? out : `${out.replace(/[*~]/g, "").slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
  };
  for (const s of sections) {
    const all = s.blocks.flatMap((b) => (b.type === "details" ? b.blocks : [b]));
    const pick = <T extends (typeof all)[number]["type"]>(t: T) => all.find((b) => b.type === t) as Extract<(typeof all)[number], { type: T }> | undefined;
    const rule = pick("rule"); if (rule) return rule.text;
    const p = pick("p"); if (p) return clip(p.text);
    const note = pick("note"); if (note) return clip(note.text);
    const list = pick("list"); if (list) return clip(list.items.slice(0, 2).join(" · "));
    const table = pick("table"); if (table && table.rows.length) return clip(table.rows.slice(0, 2).map((r) => r.join(" → ")).join(" · "));
    const ex = pick("examples"); if (ex && ex.items.length) { const it = ex.items[0] as { en: string; note?: string }; return clip(it.note ? `${it.en} → ${it.note}` : it.en); }
  }
  return null;
}
export function rulesFor(exs: { questions: { theoryAnchor?: { lesson: string; section: string } | null }[] }[]) {
  const out: Record<string, string> = {};
  for (const e of exs) for (const q of e.questions) if (q.theoryAnchor) {
    const k = `${q.theoryAnchor.lesson}#${q.theoryAnchor.section}`;
    if (!(k in out)) { const r = ruleSummary(q.theoryAnchor.lesson, q.theoryAnchor.section); if (r) out[k] = r; }
  }
  return out;
}
