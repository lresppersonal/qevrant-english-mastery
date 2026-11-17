import { z } from "zod";

/**
 * Shared by server (structured output) and client (rendering).
 * Band figures are EDUCATIONAL ESTIMATES informed by public IELTS/Cambridge criteria — never official scores.
 */
export const Rating = z.enum(["emerging", "developing", "secure", "strong"]);
export type Rating = z.infer<typeof Rating>;
export const RATING_LABEL: Record<Rating, string> = { emerging: "Emerging", developing: "Developing", secure: "Secure", strong: "Strong" };
export const RATING_ORDER: Rating[] = ["emerging", "developing", "secure", "strong"];

const Criterion = z.object({
  criterion: z.string(),
  band: z.number().min(0).max(9).describe("Estimated IELTS-style band for this criterion only, 0–9 in steps of 0.5"),
  rating: Rating,
  comment: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

const Issue = z.object({
  quote: z.string().describe("Exact words copied from the learner's text, 2-25 words"),
  problem: z.string().describe("Short explanation of why this is wrong or unnatural"),
  suggestion: z.string().describe("Corrected or more natural version of the quoted words"),
  category: z.enum(["grammar", "vocabulary", "collocation", "cohesion", "register", "task", "spelling_punctuation"]),
  severity: z.enum(["error", "unnatural", "style"]).describe("error = clearly wrong; unnatural = understandable but not what a proficient user would say; style = acceptable but could be stronger"),
  grammarRef: z.string().nullable().describe("One id from the GRAMMAR CATALOGUE, or null"),
});

const Upgrade = z.object({
  original: z.string(),
  better: z.string(),
  why: z.string(),
  senseRef: z.string().nullable().describe("A sense id from the VOCABULARY LIST if the upgrade uses one of those items, else null"),
});

const Repetition = z.object({
  word: z.string().describe("The repeated word or phrase, e.g. 'very important'"),
  count: z.number().int(),
  alternatives: z.array(z.string()).describe("2-4 natural alternatives that fit the learner's level, e.g. crucial, essential"),
  note: z.string(),
});

const Collocation = z.object({
  original: z.string().describe("Exact words from the learner's text"),
  natural: z.string(),
  explanation: z.string(),
});

export const WritingFeedback = z.object({
  summary: z.string(),
  overallAssessment: z.string().describe("3-5 sentences: overall quality, the main thing holding the essay back, and the main strength"),
  indicativeLevel: z.enum(["B1", "B2", "B2+", "C1", "C2"]),
  criteria: z.array(Criterion),
  issues: z.array(Issue),
  collocations: z.array(Collocation),
  repetition: z.array(Repetition),
  vocabularyUpgrades: z.array(Upgrade).describe("Academic alternatives to informal or vague wording"),
  argumentAdvice: z.array(z.string()).describe("How to develop the argument: clearer position, better support, counter-arguments"),
  paragraphAdvice: z.array(z.object({ paragraph: z.number().int(), focus: z.string(), advice: z.string() })),
  rewrite: z.object({ original: z.string(), improved: z.string(), note: z.string() }).nullable(),
  correctedEssay: z.string().describe("The learner's essay with errors corrected and unnatural wording fixed, keeping their ideas, structure and level. Do not make it sound like a different writer."),
  nextSteps: z.array(z.string()),
});
export type WritingFeedback = z.infer<typeof WritingFeedback>;

export const SpeakingFeedback = z.object({
  summary: z.string(),
  overallAssessment: z.string(),
  topicRelevance: z.object({ rating: Rating, comment: z.string().describe("Did the answer address the question and its points? What was missing?") }),
  indicativeLevel: z.enum(["B1", "B2", "B2+", "C1", "C2"]),
  criteria: z.array(Criterion),
  issues: z.array(Issue),
  spokenVariation: z.array(z.string()).describe("Features that would be wrong in writing but are normal and acceptable in natural speech, so the learner doesn't 'fix' them"),
  repetition: z.array(Repetition),
  vocabularyUpgrades: z.array(Upgrade).describe("More natural or precise spoken expressions"),
  usefulPhrases: z.array(z.object({ phrase: z.string(), use: z.string() })),
  nextSteps: z.array(z.string()),
});
export type SpeakingFeedback = z.infer<typeof SpeakingFeedback>;

/** Added by the server after the AI call (deterministic, transparent). */
export const BandEstimate = z.object({ mean: z.number(), low: z.number(), high: z.number(), basis: z.string() });
export type BandEstimate = z.infer<typeof BandEstimate>;

const roundHalf = (n: number) => Math.round(n * 2) / 2;
export function bandEstimate(criteria: { band?: number }[]): BandEstimate | null {
  const bands = criteria.map((c) => c.band).filter((b): b is number => typeof b === "number");
  if (!bands.length) return null;
  const mean = bands.reduce((a, b) => a + b, 0) / bands.length;
  const low = Math.max(0, Math.floor((mean - 0.25) * 2) / 2);
  const high = Math.min(9, Math.ceil((mean + 0.25) * 2) / 2);
  return { mean: roundHalf(mean), low, high, basis: `Average of ${bands.length} criterion estimates (${bands.join(", ")}), shown as a range because a single piece of work is limited evidence.` };
}

/** Client-side parsing: tolerant of feedback saved before these fields existed. */
const viewOverrides = { summary: z.string(), indicativeLevel: z.string(), criteria: z.array(Criterion.partial({ band: true })), issues: z.array(Issue.partial({ severity: true })) };
export const WritingFeedbackView = WritingFeedback.partial().extend({ ...viewOverrides, estimate: BandEstimate.nullable().optional() });
export const SpeakingFeedbackView = SpeakingFeedback.partial().extend({ ...viewOverrides, estimate: BandEstimate.nullable().optional(), pronunciation: z.object({ assessed: z.boolean(), note: z.string() }).optional() });
export type WritingFeedbackView = z.infer<typeof WritingFeedbackView>;
export type SpeakingFeedbackView = z.infer<typeof SpeakingFeedbackView>;

export const CRITERIA_LABEL: Record<string, string> = {
  task_response: "Task response",
  coherence_cohesion: "Coherence and cohesion",
  lexical_resource: "Vocabulary range and accuracy",
  grammatical_range_accuracy: "Grammatical range and accuracy",
  fluency_coherence: "Fluency and coherence",
};

const STOP = new Set("the a an and or but of to in on at for with from by is are was were be been being it its this that these those there their they them he she his her we our you your i my me as not no so if than then which who whom what when where why how do does did have has had will would can could should may might must also more most very just about into over such some any all can't don't it's i'm".split(" "));

/** Repeated words and two-word phrases, computed from the text (given to the AI as evidence). */
export function repetitionStats(text: string) {
  const tokens = text.toLowerCase().replace(/[^a-z'\s-]/g, " ").split(/\s+/).filter(Boolean);
  const counts = new Map<string, number>();
  for (const t of tokens) if (t.length >= 4 && !STOP.has(t)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const bigrams = new Map<string, number>();
  for (let i = 0; i < tokens.length - 1; i++) {
    const [a, b] = [tokens[i], tokens[i + 1]];
    if ((STOP.has(a) && STOP.has(b)) || a.length < 2 || b.length < 3) continue;
    if (["very", "really", "so", "a lot", "lots"].includes(a) || !STOP.has(b)) bigrams.set(`${a} ${b}`, (bigrams.get(`${a} ${b}`) ?? 0) + 1);
  }
  const words = [...counts].filter(([, n]) => n >= 3).sort((x, y) => y[1] - x[1]).slice(0, 8);
  const phrases = [...bigrams].filter(([, n]) => n >= 2).sort((x, y) => y[1] - x[1]).slice(0, 6);
  return [...phrases, ...words].map(([w, n]) => ({ word: w, count: n }));
}

/** Delivery measures computed from the transcript itself (never by the AI). */
export function speechMetrics(transcript: string, durationSeconds: number) {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const fillers = (transcript.toLowerCase().match(/\b(um+|uh+|er+|erm+|you know|i mean)\b/g) ?? []).length;
  const minutes = Math.max(durationSeconds, 1) / 60;
  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  return {
    words: words.length,
    wordsPerMinute: Math.round(words.length / minutes),
    fillers,
    avgSentenceWords: sentences.length ? Math.round(words.length / sentences.length) : words.length,
    uniqueWordRatio: words.length ? Math.round((new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, ""))).size / words.length) * 100) / 100 : 0,
  };
}

export const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
