import { z } from "zod";
import raw from "@content/listening/resources.json";

export const LISTENING_LEVELS = ["B2", "B2+", "C1", "C2"] as const;
export const LISTENING_TYPES = { interview: "Interviews", lecture: "Lectures & talks", conversation: "Conversations", news: "News", documentary: "Documentaries", podcast: "Podcasts", debate: "Debates & discussions", educational: "Educational videos" } as const;
export const ACCENTS = { british: "British", american: "American", australian: "Australian", mixed: "Mixed / international" } as const;

export const ListeningResource = z.object({
  slug: z.string(),
  title: z.string(),
  source: z.string(),
  url: z.string().url().startsWith("https://"),
  types: z.array(z.enum(Object.keys(LISTENING_TYPES) as [keyof typeof LISTENING_TYPES])).min(1),
  levels: z.array(z.enum(LISTENING_LEVELS)).min(1),
  accent: z.enum(Object.keys(ACCENTS) as [keyof typeof ACCENTS]),
  topics: z.array(z.string()).min(1),
  duration: z.string(),
  frequency: z.string(),
  transcript: z.boolean(),
  access: z.enum(["free", "free with ads", "partly subscription"]),
  description: z.string(),
});
export type ListeningResource = z.infer<typeof ListeningResource>;

const parsed = z.object({ verifiedOn: z.string(), note: z.string(), resources: z.array(ListeningResource) }).parse(raw);
export const listeningResources = parsed.resources;
export const listeningVerifiedOn = parsed.verifiedOn;
export const listeningNote = parsed.note;
export const listeningBySlug = (slug: string) => listeningResources.find((r) => r.slug === slug);

/** Original, reusable tasks that work with any episode (no provider content is reproduced). */
export const LISTENING_TASKS: { stage: string; tasks: string[] }[] = [
  { stage: "Before you listen (2 min)", tasks: [
    "Read the episode title and write three questions you expect it to answer.",
    "Note five words you think you will hear. Tick them when you do.",
  ] },
  { stage: "First listen — gist", tasks: [
    "Don't pause. Afterwards, write the main point in one sentence.",
    "Who is speaking, and what is their attitude: neutral, critical, enthusiastic, doubtful?",
  ] },
  { stage: "Second listen — detail", tasks: [
    "Pause every 2–3 minutes and note one fact, one figure and one opinion.",
    "Catch two phrases a speaker uses to agree, disagree, hedge or change topic.",
    "If a transcript exists, check the parts you missed and mark why (speed, accent, unknown word, connected speech).",
  ] },
  { stage: "After listening — use it", tasks: [
    "Summarise the episode aloud in 60 seconds (try the 1-minute mode in Speaking).",
    "Write a 4–5 sentence response giving your own view, using two new phrases.",
    "Save the new words to your vocabulary list and review them tomorrow.",
  ] },
];
