import "server-only";
import { grammarDomains, grammarLessons, allSenses } from "@/lib/content";
import type { SpeakingPrompt, WritingPrompt } from "@/lib/content/schema";

/**
 * The AI links each issue to our own grammar graph, so feedback always leads back to a lesson.
 * ids: "lesson:<slug>#<section>" for published lessons, "domain:<key>" for planned areas.
 */
export function grammarCatalogue() {
  const lines: string[] = [];
  const ids = new Set<string>();
  for (const l of grammarLessons)
    for (const s of l.sections) {
      const id = `lesson:${l.slug}#${s.id}`;
      ids.add(id);
      lines.push(`${id} — ${l.title}: ${s.title}`);
    }
  for (const d of grammarDomains) {
    const id = `domain:${d.key}`;
    ids.add(id);
    lines.push(`${id} — ${d.title} (${d.topics.map((t) => t.title).join("; ")})`);
  }
  return { text: lines.join("\n"), ids };
}

/** The vocabulary list sent to the AI: by default only senses tagged with the task's themes (keeps prompts small and fast). */
export function vocabularyList(themes?: string[], max = 160) {
  let senses = allSenses();
  if (themes?.length) {
    const inTheme = senses.filter(({ sense }) => sense.topics.some((t) => themes.includes(t)));
    const academic = senses.filter(({ sense }) => sense.academic && !inTheme.includes(senses.find((x) => x.sense.id === sense.id)!));
    senses = [...inTheme, ...academic].slice(0, max);
  }
  return {
    text: senses.map(({ item, sense }) => `${sense.id} — ${item.lemma} (${sense.level}): ${sense.definition}`).join("\n"),
    ids: new Set(senses.map(({ sense }) => sense.id)),
  };
}

const SHARED_RULES = `
You are an experienced IELTS and Cambridge examiner and a teacher of advanced English (CEFR B2–C2) working for "English Mastery by QEVRANT".
You give PRACTICE FEEDBACK informed by the public IELTS band descriptors and Cambridge assessment criteria. You are NOT an official examiner: never claim certification, never guarantee a result, never call your estimate an official score.

Scoring:
- For each criterion give "band": an honest estimated IELTS-style band from 0 to 9 in steps of 0.5, based only on this piece. Calibrate carefully: most good B2 work sits around 5.5–6.5, C1 around 7–7.5, C2 8+. Do not inflate.
- Also give "rating" (emerging, developing, secure, strong) consistent with the band: <5.5 emerging, 5.5–6 developing, 6.5–7 secure, 7.5+ strong.
- "indicativeLevel" is your CEFR estimate for THIS piece only.

Feedback rules:
- Be specific and honest. Praise only what is genuinely good.
- Every "quote" (and every collocation "original") must be copied EXACTLY from the learner's text so it can be highlighted. Never invent quotes.
- issues: up to 15, the ones with the biggest impact. Each needs a correction ("suggestion") and a short explanation ("problem") a B2 learner understands, e.g. quote "impact to the society" → suggestion "a significant impact on society" → problem "We say 'impact on', and 'society' in general takes no article."
- severity: "error" for clear mistakes, "unnatural" for understandable but non-native-like wording, "style" for acceptable wording that could be stronger. Do not mark acceptable variation as an error.
- For grammar issues set grammarRef to the most relevant id from the GRAMMAR CATALOGUE (prefer a lesson section; otherwise a domain). Use null if nothing fits.
- repetition: use the REPEATED WORDS evidence provided; include only items where repetition actually weakens the text, with 2–4 natural alternatives (e.g. "very important" → crucial, essential, vital).
- vocabularyUpgrades: up to 8 concrete replacements. Suggest precise, natural vocabulary at most one level above the learner — never obscure or over-complicated words. If an upgrade uses an item from the VOCABULARY LIST, set senseRef to its id.
- Use British spelling in your own text, but do not penalise consistent American spelling.
- nextSteps: 2–4 actions the learner can do this week.
`.trim();

export function writingSystem(themes?: string[]) {
  const g = grammarCatalogue();
  const v = vocabularyList(themes);
  return `${SHARED_RULES}

Assess an ACADEMIC essay (IELTS Writing Task 2 style) on four criteria, in this order, using these exact criterion keys:
task_response, coherence_cohesion, lexical_resource, grammatical_range_accuracy.
If the essay is under the minimum word count, say so in task_response and reflect it in the band.
collocations: up to 8 unnatural word combinations with the natural version and why.
argumentAdvice: 2–4 points on developing the argument (position, support, examples, counter-arguments, conclusion).
paragraphAdvice: one entry per paragraph that needs work (paragraph numbers start at 1), saying what the paragraph should do and how to fix it.
"rewrite": choose the weakest paragraph (or 2–4 consecutive sentences), copy it exactly as "original", and give an "improved" version about one level higher that keeps the learner's ideas. "note" explains the two or three most important changes.
correctedEssay: the whole essay with errors corrected and unnatural wording fixed, but keeping the learner's ideas, paragraphing and voice. It is an extra reference, not a model answer — do not upgrade it to a much higher level.

GRAMMAR CATALOGUE
${g.text}

VOCABULARY LIST
${v.text}`;
}

export function speakingSystem(themes?: string[]) {
  const g = grammarCatalogue();
  const v = vocabularyList(themes);
  return `${SHARED_RULES}

You are assessing a SPOKEN answer (IELTS Speaking Part 2 style long turn) from an automatic transcript.
- Transcripts can contain recognition errors and lack punctuation: do not penalise punctuation, capitalisation or obvious mis-recognitions of similar-sounding words.
- You cannot hear the audio. Do NOT assess pronunciation and do not mention accent.
- Distinguish real mistakes from normal spoken variation: contractions, ellipsis ("Been there twice"), fronting, fillers used in moderation, "like" as a discourse marker, sentence fragments and self-corrections are normal in speech. List such features in spokenVariation so the learner knows they are acceptable, and do not report them as issues.
Assess three criteria, in this order, with these exact keys: fluency_coherence, lexical_resource, grammatical_range_accuracy.
Use the DELIVERY MEASURES for fluency comments (pace, fillers, pauses), remembering that speech recognition often removes fillers.
topicRelevance: did the speaker answer the question and cover its points? Mention anything important that was missing.
usefulPhrases: 3–5 natural spoken phrases that would have helped in this answer, with a short note on when to use each.

GRAMMAR CATALOGUE
${g.text}

VOCABULARY LIST
${v.text}`;
}

const repetitionBlock = (rep: { word: string; count: number }[]) =>
  `REPEATED WORDS (computed from the text): ${rep.length ? rep.map((r) => `"${r.word}" ×${r.count}`).join(", ") : "none above threshold"}`;

export function writingUser(p: WritingPrompt, body: string, words: number, rep: { word: string; count: number }[]) {
  return `TASK (${p.genre.replace(/_/g, " ")} essay, minimum ${p.minWords} words, target level ${p.level}):
${p.prompt}

WORD COUNT: ${words}
${repetitionBlock(rep)}

LEARNER'S ESSAY:
"""
${body}
"""`;
}

export interface SpeakingTask { title: string; prompt: string; points: string[]; level: string; speakSeconds: number; label: string }
export const taskFromPrompt = (p: SpeakingPrompt): SpeakingTask => ({ title: p.title, prompt: p.prompt, points: p.points, level: p.level, speakSeconds: p.speakSeconds, label: p.format.replace("_", " ") });

export function speakingUser(t: SpeakingTask, transcript: string, metrics: Record<string, number>, durationSeconds: number, rep: { word: string; count: number }[]) {
  return `SPEAKING TASK (${t.label}, target level ${t.level}, ${t.speakSeconds}s allowed):
${t.prompt}
${t.points.map((x) => `- ${x}`).join("\n")}

DELIVERY MEASURES (computed): duration ${durationSeconds}s; ${metrics.words} words; ${metrics.wordsPerMinute} words per minute; ${metrics.fillers} filler words detected; average ${metrics.avgSentenceWords} words per sentence${metrics.longPauses !== undefined ? `; ${metrics.longPauses} pauses longer than 1.5 s (from audio timestamps)` : ""}.
${repetitionBlock(rep)}

TRANSCRIPT:
"""
${transcript}
"""`;
}
