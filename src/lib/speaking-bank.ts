import bank from "@content/generated/speaking-bank.json";

export type SpeakingLevel = "B2" | "B2+" | "C1" | "C2";
export interface BankPrompt { id: string; category: string; level: SpeakingLevel; prompt: string; points: string[] }

export const SPEAKING_CATEGORIES = bank.categories as { slug: string; title: string }[];
export const SPEAKING_BANK = bank.prompts as BankPrompt[];
export const SPEAKING_LEVELS: SpeakingLevel[] = ["B2", "B2+", "C1", "C2"];

/** Timing is tied to the mode and cannot be edited separately. */
export const SPEAKING_MODES = {
  one: { key: "one", label: "1-minute", prepSeconds: 15, speakSeconds: 60 },
  two: { key: "two", label: "2-minute", prepSeconds: 60, speakSeconds: 120 },
} as const;
export type SpeakingMode = keyof typeof SPEAKING_MODES;

export const bankPrompt = (id: string) => SPEAKING_BANK.find((p) => p.id === id);
export const categoryTitle = (slug: string) => SPEAKING_CATEGORIES.find((c) => c.slug === slug)?.title ?? slug;

/** Prompts matching the filters. level "all" / category "all" mean no filter. */
export function matchingPrompts(level: SpeakingLevel | "all", category: string | "all") {
  return SPEAKING_BANK.filter((p) => (level === "all" || p.level === level) && (category === "all" || p.category === category));
}

/**
 * Random prompt that respects the filters and avoids recently shown ones.
 * If every matching prompt was shown recently, the least recently shown one is reused.
 */
export function pickPrompt(level: SpeakingLevel | "all", category: string | "all", recent: string[], rand: () => number = Math.random): BankPrompt | null {
  const pool = matchingPrompts(level, category);
  if (!pool.length) return null;
  const fresh = pool.filter((p) => !recent.includes(p.id));
  if (fresh.length) return fresh[Math.floor(rand() * fresh.length)];
  // all used: choose the one shown longest ago (earliest in `recent`, which is newest-last)
  return [...pool].sort((a, b) => recent.indexOf(a.id) - recent.indexOf(b.id))[0];
}
