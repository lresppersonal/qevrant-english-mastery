import { z } from "zod";
import part1 from "@content/synonyms/part1.json";
import part2 from "@content/synonyms/part2.json";

/**
 * Academic & Advanced Synonyms: original QEVRANT content. Each group explains how near-synonyms
 * differ in meaning, register, collocation and grammar, with contextual exercises in which only
 * one option is the best answer and every option is explained.
 */
const Member = z.object({ word: z.string(), meaning: z.string(), register: z.string(), collocations: z.array(z.string()), grammar: z.string(), example: z.string() });
export const SYN_TYPES = ["replace", "precise", "inappropriate", "near", "register", "collocation"] as const;
const Exercise = z.object({
  type: z.enum(SYN_TYPES), sentence: z.string(), options: z.array(z.string()).length(4), answer: z.number().int().min(0).max(3),
  explanation: z.string(), optionNotes: z.array(z.string()).length(4), interchangeable: z.string(), examples: z.array(z.string()).min(1).max(3),
});
const Group = z.object({ id: z.string(), headword: z.string(), category: z.string(), pos: z.string(), summary: z.string(), members: z.array(Member).min(3), note: z.string(), exercises: z.array(Exercise).min(3) });
export type SynGroup = z.infer<typeof Group>;
export type SynExercise = z.infer<typeof Exercise> & { id: string; group: string };
export type SynType = (typeof SYN_TYPES)[number];

export const SYNONYM_GROUPS: SynGroup[] = z.array(Group).parse([...part1, ...part2]);
export const getSynGroup = (id: string) => SYNONYM_GROUPS.find((g) => g.id === id);
export const SYN_CATEGORIES = [...new Set(SYNONYM_GROUPS.map((g) => g.category))];
export const allSynExercises = (): SynExercise[] => SYNONYM_GROUPS.flatMap((g) => g.exercises.map((e, i) => ({ ...e, id: `${g.id}-${i + 1}`, group: g.id })));
export const TYPE_LABEL: Record<SynType, string> = {
  replace: "Best contextual replacement", precise: "Most precise word", inappropriate: "Which substitution doesn't work?",
  near: "Near-synonyms", register: "Formal or informal?", collocation: "Correct collocation",
};
