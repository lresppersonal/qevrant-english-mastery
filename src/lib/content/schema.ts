import { z } from "zod";

export const LEVELS = ["B2", "B2+", "C1", "C2"] as const;
export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;

export const Register = z.enum(["neutral", "formal", "informal", "academic", "spoken"]);
export const Status = z.enum(["draft", "in_review", "published", "archived"]);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case");

/** Every content record carries editorial metadata (spec §7.3). */
const Meta = z.object({
  status: Status,
  version: z.number().int().positive(),
  author: z.string(),
  reviewer: z.string().nullable(),
  publishedAt: z.string().nullable(),
});

/** Internal provenance only: never rendered to learners. */
export const SourceRef = z.object({
  book: z.string(),
  unit: z.string(),
  lesson: z.string().optional(),
  confidence: z.enum(["verified", "uncertain", "editorial"]),
});

// ---------- Themes (the primary organising structure; CEFR is metadata) ----------
export const Theme = z.object({
  slug,
  title: z.string(),
  group: z.string(),
  summary: z.string(),
  sources: z.array(z.string()),
});
export type Theme = z.infer<typeof Theme>;

// ---------- Rich text blocks ----------
export const Block = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string() }),
  z.object({ type: z.literal("list"), items: z.array(z.string()).min(1) }),
  z.object({
    type: z.literal("examples"),
    items: z.array(z.object({ en: z.string(), note: z.string().optional(), wrong: z.boolean().optional() })).min(1),
  }),
  z.object({ type: z.literal("table"), head: z.array(z.string()), rows: z.array(z.array(z.string())) }),
  z.object({ type: z.literal("note"), tone: z.enum(["tip", "warning", "register"]), text: z.string() }),
]);
export type Block = z.infer<typeof Block>;

// ---------- Grammar ----------
export const SectionKind = z.enum(["overview", "form", "uses", "contrasts", "errors", "register", "pronunciation", "summary"]);
export const LinkType = z.enum(["prerequisite", "extends", "contrasts_with", "practises", "appears_in"]);

export const GrammarLesson = Meta.extend({
  id: z.string().uuid(),
  slug,
  title: z.string(),
  level: Level,
  domain: z.string(),
  topics: z.array(slug),
  summary: z.string(),
  minutes: z.number().int().positive(),
  sections: z.array(z.object({ id: slug, kind: SectionKind, title: z.string(), blocks: z.array(Block).min(1) })).min(3),
  links: z.array(z.object({ type: LinkType, to: z.string(), label: z.string(), level: Level, published: z.boolean() })),
  exercises: z.array(slug),
  sources: z.array(SourceRef),
});
export type GrammarLesson = z.infer<typeof GrammarLesson>;

export const GrammarDomain = z.object({
  key: slug,
  number: z.number().int(),
  title: z.string(),
  description: z.string(),
  topics: z.array(z.object({ title: z.string(), level: Level, lesson: slug.nullable() })),
});
export type GrammarDomain = z.infer<typeof GrammarDomain>;

// ---------- Vocabulary: one item, many level-tagged senses (D-11) ----------
export const Sense = z.object({
  id: slug,
  level: Level,
  register: Register,
  academic: z.boolean(),
  definition: z.string(),
  examples: z.array(z.string()).min(1),
  collocations: z.array(z.string()),
  synonyms: z.array(z.string()).default([]),
  /** one entry per learner language; ru required for MVP (A7) */
  translations: z.object({ ru: z.string() }).catchall(z.string()),
  /** theme slugs; the first is the primary theme, the rest are tags */
  topics: z.array(slug).min(1),
});
export type Sense = z.infer<typeof Sense>;

export const VocabItem = Meta.extend({
  id: z.string().uuid(),
  slug,
  lemma: z.string(),
  kind: z.enum(["word", "collocation", "phrasal_verb", "idiom", "phrase"]),
  /** lexical classification used inside a theme */
  lexClass: z.enum(["noun", "verb", "adjective", "adverb", "collocation", "phrasal_verb", "idiom", "fixed_expression"]).optional(),
  subtopic: z.string().optional(),
  pos: z.string(),
  ipa: z.string().optional(),
  family: z.array(z.object({ form: z.string(), pos: z.string() })).default([]),
  /** surface forms that should resolve to this item in reading texts */
  forms: z.array(z.string()).default([]),
  senses: z.array(Sense).min(1),
  sources: z.array(SourceRef),
  /** which reference books contain this headword (checked automatically); empty = editorial addition */
  attestedIn: z.array(z.string()).default([]),
});
export type VocabItem = z.infer<typeof VocabItem>;

// ---------- Practice ----------
const TheoryAnchor = z.object({ lesson: slug, section: slug });
export const Question = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("choice"),
    id: slug,
    format: z.string().optional(),
    level: Level.optional(),
    prompt: z.string(),
    options: z.array(z.string()).min(2),
    answer: z.number().int().nonnegative(),
    explanation: z.string(),
    errorTag: z.string().optional(),
    theoryAnchor: TheoryAnchor.nullable(),
    targetSense: z.string().optional(),
  }),
  z.object({
    kind: z.literal("text"),
    id: slug,
    format: z.string().optional(),
    level: Level.optional(),
    prompt: z.string(),
    accepted: z.array(z.string()).min(1),
    explanation: z.string(),
    errorTag: z.string().optional(),
    theoryAnchor: TheoryAnchor.nullable(),
    targetSense: z.string().optional(),
  }),
]);
export type Question = z.infer<typeof Question>;

export const Exercise = Meta.extend({
  id: z.string().uuid(),
  slug,
  title: z.string(),
  skill: z.enum(["grammar", "vocabulary", "reading"]),
  format: z.enum(["gap_fill", "multiple_choice", "matching", "tfng", "transformation", "mixed",
    "matching_headings", "matching_information", "sentence_completion", "summary_completion", "short_answer"]),
  level: Level,
  topics: z.array(slug),
  target: z.object({ type: z.enum(["lesson", "vocab_set", "text"]), ref: slug }),
  instructions: z.string(),
  passageRef: slug.optional(),
  questions: z.array(Question).min(2),
});
export type Exercise = z.infer<typeof Exercise>;

// ---------- Reading ----------
export const ReadingText = Meta.extend({
  id: z.string().uuid(),
  slug,
  title: z.string(),
  standfirst: z.string(),
  level: Level,
  topics: z.array(slug),
  minutes: z.number().int(),
  paragraphs: z.array(z.string()).min(3),
  exercises: z.array(slug),
  /** theme slug used to file the text in the library */
  category: slug.optional(),
  keyVocabulary: z.array(z.object({ term: z.string(), definition: z.string(), ru: z.string(), sense: z.string().optional() })).default([]),
  expressions: z.array(z.object({ phrase: z.string(), meaning: z.string() })).default([]),
  critical: z.array(z.object({ question: z.string(), points: z.string() })).default([]),
  origin: z.enum(["original"]).default("original"),
});
export type ReadingText = z.infer<typeof ReadingText>;

// ---------- Speaking & academic writing prompts ----------
export const SpeakingPrompt = Meta.extend({
  slug,
  title: z.string(),
  level: Level,
  topics: z.array(slug),
  format: z.enum(["interview", "long_turn", "discussion"]),
  prompt: z.string(),
  points: z.array(z.string()),
  prepSeconds: z.number().int().nonnegative(),
  speakSeconds: z.number().int().positive(),
  usefulLanguage: z.array(z.string()),
});
export type SpeakingPrompt = z.infer<typeof SpeakingPrompt>;

export const ESSAY_TYPES = ["opinion", "discussion", "advantages_disadvantages", "problem_solution", "two_part", "positive_negative", "cause_effect", "cause_problem_solution"] as const;
export const EssayType = z.enum(ESSAY_TYPES);
export type EssayType = z.infer<typeof EssayType>;

export const WritingPrompt = Meta.extend({
  slug,
  title: z.string(),
  level: Level,
  /** theme slugs; the first is the main topic */
  topics: z.array(slug).min(1),
  genre: EssayType,
  prompt: z.string(),
  minWords: z.number().int(),
  suggestedMinutes: z.number().int(),
  guidance: z.array(z.string()),
  /** sense ids from the vocabulary database */
  usefulLanguage: z.array(z.string()).default([]),
  /** suggested paragraph plan for this question */
  plan: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  collocations: z.array(z.string()).default([]),
  ideas: z.array(z.string()).default([]),
});

/** Shared guidance for each essay type. */
export const EssayTypeGuide = z.object({
  type: EssayType,
  title: z.string(),
  recognise: z.string(),
  structure: z.array(z.string()),
  linking: z.array(z.string()),
});
export type EssayTypeGuide = z.infer<typeof EssayTypeGuide>;
export type WritingPrompt = z.infer<typeof WritingPrompt>;
