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

export function vocabularyList() {
  const senses = allSenses();
  return {
    text: senses.map(({ item, sense }) => `${sense.id} — ${item.lemma} (${sense.level}): ${sense.definition}`).join("\n"),
    ids: new Set(senses.map(({ sense }) => sense.id)),
  };
}

const SHARED_RULES = `
You are an expert examiner and teacher of advanced English (CEFR B2–C2) working for "English Mastery by QEVRANT".
You give PRACTICE FEEDBACK. You never give an official score, never give an IELTS band or any numeric score, and never claim affiliation with any exam board.
Ratings per criterion use only: emerging, developing, secure, strong.
"indicativeLevel" is your honest CEFR estimate for THIS piece only.

Rules:
- Be specific and honest. Praise only what is genuinely good. Do not inflate.
- Every "quote" must be copied EXACTLY from the learner's text (so it can be highlighted). Never invent quotes.
- Report at most 10 issues, choosing those with the biggest impact on clarity and level. Prefer recurring patterns over one-off slips.
- For each grammar issue, set grammarRef to the most relevant id from the GRAMMAR CATALOGUE (prefer a lesson section; otherwise a domain). Use null if nothing fits.
- vocabularyUpgrades: up to 6 concrete replacements that raise precision or register. If an upgrade uses an item from the VOCABULARY LIST, set senseRef to its id.
- Explanations must be clear for a B2 learner: short sentences, no linguistic jargon without an example.
- Use British spelling in your own text, but do not penalise consistent American spelling.
- nextSteps: 2–4 actions the learner can do this week.
`.trim();

export function writingSystem() {
  const g = grammarCatalogue();
  const v = vocabularyList();
  return `${SHARED_RULES}

Assess an ACADEMIC essay on four criteria, in this order, using these exact criterion keys:
task_response, coherence_cohesion, lexical_resource, grammatical_range_accuracy.
If the essay is under the minimum word count, say so in task_response.
"rewrite": choose the weakest paragraph (or 2–4 consecutive sentences), copy it exactly as "original", and give an "improved" version at roughly one CEFR level higher that keeps the learner's ideas. "note" explains the two or three most important changes.

GRAMMAR CATALOGUE
${g.text}

VOCABULARY LIST
${v.text}`;
}

export function speakingSystem() {
  const g = grammarCatalogue();
  const v = vocabularyList();
  return `${SHARED_RULES}

You are assessing a SPOKEN answer from an automatic transcript. Transcripts can contain recognition errors and usually lack punctuation: do not penalise punctuation, capitalisation or obvious mis-recognitions of similar-sounding words. You cannot hear pronunciation, so do not comment on it.
Assess three criteria, in this order, with these exact keys: fluency_coherence, lexical_resource, grammatical_range_accuracy.
Use the DELIVERY MEASURES provided for fluency comments (pace, fillers), but remember that speech recognition often removes fillers.
usefulPhrases: 3–5 natural spoken phrases that would have helped in this answer, with a short note on when to use each.

GRAMMAR CATALOGUE
${g.text}

VOCABULARY LIST
${v.text}`;
}

export function writingUser(p: WritingPrompt, body: string, words: number) {
  return `TASK (${p.genre.replace(/_/g, " ")} essay, minimum ${p.minWords} words, target level ${p.level}):
${p.prompt}

WORD COUNT: ${words}

LEARNER'S ESSAY:
"""
${body}
"""`;
}

export function speakingUser(p: SpeakingPrompt, transcript: string, metrics: Record<string, number>, durationSeconds: number) {
  return `SPEAKING TASK (${p.format.replace("_", " ")}, target level ${p.level}, ${p.speakSeconds}s allowed):
${p.prompt}
${p.points.map((x) => `- ${x}`).join("\n")}

DELIVERY MEASURES (computed from the transcript): duration ${durationSeconds}s; ${metrics.words} words; ${metrics.wordsPerMinute} words per minute; ${metrics.fillers} filler words detected; average ${metrics.avgSentenceWords} words per sentence.

TRANSCRIPT:
"""
${transcript}
"""`;
}
