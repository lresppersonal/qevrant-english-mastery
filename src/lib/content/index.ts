import { z } from "zod";
import {
  Topic, GrammarDomain, GrammarLesson, VocabItem, Exercise, ReadingText, SpeakingPrompt, WritingPrompt,
  type Sense, type Level,
} from "./schema";

import topicsJson from "@content/topics.json";
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

export const topics = z.array(Topic).parse(topicsJson);
export const grammarDomains = z.array(GrammarDomain).parse(domainsJson);
export const grammarLessons = [relLesson, nomLesson].map((l) => GrammarLesson.parse(l));
export const vocabItems = vocabFile(eduVocab as never);
export const exercises = [ex1, ex2, ex3, ex4].map((e) => Exercise.parse(e));
export const readingTexts = [reading1].map((r) => ReadingText.parse(r));
export const speakingPrompts = z.array(SpeakingPrompt).parse(speakingEdu);
export const writingPrompts = z.array(WritingPrompt).parse(writingEdu);

// ---------- lookups ----------
export const getLesson = (slug: string) => grammarLessons.find((l) => l.slug === slug);
export const getExercise = (slug: string) => exercises.find((e) => e.slug === slug);
export const getReading = (slug: string) => readingTexts.find((r) => r.slug === slug);
export const getTopic = (slug: string) => topics.find((t) => t.slug === slug);
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

export const LEVEL_ORDER: Level[] = ["B2", "B2+", "C1", "C2"];
export const levelRank = (l: Level) => LEVEL_ORDER.indexOf(l);

/** Cross-reference checks the type system cannot express. Returns a list of problems. */
export function validateGraph(): string[] {
  const problems: string[] = [];
  const lessonSlugs = new Set(grammarLessons.map((l) => l.slug));
  const exerciseSlugs = new Set(exercises.map((e) => e.slug));
  const readingSlugs = new Set(readingTexts.map((r) => r.slug));
  const topicSlugs = new Set(topics.map((t) => t.slug));
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
  for (const r of readingTexts) r.exercises.forEach((x) => !exerciseSlugs.has(x) && problems.push(`reading ${r.slug}: missing exercise ${x}`));
  for (const p of [...speakingPrompts, ...writingPrompts])
    p.usefulLanguage.forEach((s) => !getSense(s) && problems.push(`prompt ${p.slug}: unknown sense ${s}`));

  return problems;
}
