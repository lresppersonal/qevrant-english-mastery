import { z } from "zod";

/** Shared by server (structured output) and client (rendering). No numeric band scores, by design. */
export const Rating = z.enum(["emerging", "developing", "secure", "strong"]);
export type Rating = z.infer<typeof Rating>;
export const RATING_LABEL: Record<Rating, string> = { emerging: "Emerging", developing: "Developing", secure: "Secure", strong: "Strong" };
export const RATING_ORDER: Rating[] = ["emerging", "developing", "secure", "strong"];

const Criterion = z.object({
  criterion: z.string(),
  rating: Rating,
  comment: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

const Issue = z.object({
  quote: z.string().describe("Exact words copied from the learner's text, 2-25 words"),
  problem: z.string(),
  suggestion: z.string().describe("Corrected or improved version of the quoted words"),
  category: z.enum(["grammar", "vocabulary", "cohesion", "register", "task", "spelling_punctuation"]),
  grammarRef: z.string().nullable().describe("One id from the GRAMMAR CATALOGUE, or null"),
});

const Upgrade = z.object({
  original: z.string(),
  better: z.string(),
  why: z.string(),
  senseRef: z.string().nullable().describe("A sense id from the VOCABULARY LIST if the upgrade uses one of those items, else null"),
});

export const WritingFeedback = z.object({
  summary: z.string(),
  indicativeLevel: z.enum(["B1", "B2", "B2+", "C1", "C2"]),
  criteria: z.array(Criterion),
  issues: z.array(Issue),
  vocabularyUpgrades: z.array(Upgrade),
  rewrite: z.object({ original: z.string(), improved: z.string(), note: z.string() }).nullable(),
  nextSteps: z.array(z.string()),
});
export type WritingFeedback = z.infer<typeof WritingFeedback>;

export const SpeakingFeedback = z.object({
  summary: z.string(),
  indicativeLevel: z.enum(["B1", "B2", "B2+", "C1", "C2"]),
  criteria: z.array(Criterion),
  issues: z.array(Issue),
  vocabularyUpgrades: z.array(Upgrade),
  usefulPhrases: z.array(z.object({ phrase: z.string(), use: z.string() })),
  nextSteps: z.array(z.string()),
});
export type SpeakingFeedback = z.infer<typeof SpeakingFeedback>;

export const CRITERIA_LABEL: Record<string, string> = {
  task_response: "Task response",
  coherence_cohesion: "Coherence and cohesion",
  lexical_resource: "Vocabulary range and accuracy",
  grammatical_range_accuracy: "Grammatical range and accuracy",
  fluency_coherence: "Fluency and coherence",
};

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
