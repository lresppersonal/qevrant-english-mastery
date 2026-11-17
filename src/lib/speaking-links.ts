import { vocabItems } from "./content";
import type { Sense, VocabItem } from "./content/schema";
import { SPEAKING_BANK, type BankPrompt } from "./speaking-bank";

/**
 * Connects Speaking topics to the thematic vocabulary database: each speaking category maps to one or
 * more vocabulary themes, and each topic gets a small "language kit" drawn from those themes, so
 * learners practise retrieving words they have studied rather than reading a fixed list.
 */
export const CATEGORY_THEMES: Record<string, string[]> = {
  general: ["everyday-life", "hobbies-leisure"], academic: ["education", "science-technology"], education: ["education"],
  environment: ["environment", "nature-wildlife"], technology: ["science-technology", "communication-media"],
  business: ["business-finance", "economics-globalisation"], society: ["society-politics", "cities-urban"],
  psychology: ["psychology-behaviour", "relationships-personality"], science: ["science-technology", "health-medicine"],
  health: ["health-medicine", "sports-fitness", "food-nutrition"], global: ["economics-globalisation", "society-politics", "environment"],
  personal: ["relationships-personality", "psychology-behaviour"], lifestyle: ["everyday-life", "food-nutrition", "hobbies-leisure"],
  travel: ["travel-tourism", "transport-movement"], media: ["communication-media", "arts-culture"], work: ["work-careers", "business-finance"],
};
export const themeCategories = (theme: string) => Object.entries(CATEGORY_THEMES).filter(([, t]) => t.includes(theme)).map(([c]) => c);

export interface KitEntry { slug: string; lemma: string; senseId: string; level: string; hint: string }
export interface LanguageKit { advanced: KitEntry[]; collocations: KitEntry[]; idioms: KitEntry[]; phrasalVerbs: KitEntry[]; academic: KitEntry[]; conversational: KitEntry[] }

const LEVEL_RANK: Record<string, number> = { B2: 0, "B2+": 1, C1: 2, C2: 3 };
/** Stable pseudo-random order per topic, so the kit doesn't change on every visit but differs between topics. */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export function languageKit(themes: string[], seed = "", level?: string): LanguageKit {
  const pool: { item: VocabItem; sense: Sense }[] = [];
  for (const item of vocabItems) for (const sense of item.senses) if (sense.topics.some((t) => themes.includes(t))) pool.push({ item, sense });
  const order = (xs: typeof pool) => xs.map((x) => ({ x, k: hash(seed + x.sense.id) })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const minRank = level ? Math.max(0, (LEVEL_RANK[level] ?? 0) - 1) : 0;
  const pick = (f: (x: (typeof pool)[number]) => boolean, n: number) =>
    order(pool.filter((x) => f(x) && (LEVEL_RANK[x.sense.level] ?? 0) >= minRank)).slice(0, n)
      .map(({ item, sense }) => ({ slug: item.slug, lemma: item.lemma, senseId: sense.id, level: sense.level, hint: sense.collocations[0] ?? sense.definition }));
  const used = new Set<string>();
  const uniq = (xs: KitEntry[]) => xs.filter((x) => (used.has(x.slug) ? false : (used.add(x.slug), true)));
  return {
    idioms: uniq(pick(({ item }) => item.kind === "idiom", 3)),
    phrasalVerbs: uniq(pick(({ item }) => item.kind === "phrasal_verb", 3)),
    collocations: uniq(pick(({ item }) => item.kind === "collocation", 4)),
    academic: uniq(pick(({ sense }) => sense.academic, 4)),
    advanced: uniq(pick(({ item, sense }) => item.kind === "word" && !sense.academic && (LEVEL_RANK[sense.level] ?? 0) >= 2, 4)),
    conversational: uniq(pick(({ sense }) => sense.register === "informal" || sense.register === "spoken", 3)),
  };
}

export const kitForPrompt = (p: BankPrompt) => languageKit(CATEGORY_THEMES[p.category] ?? [], p.id, p.level);

/**
 * Speaking topics that let the learner use vocabulary they studied recently: themes are weighted by how
 * recently and how often the learner saved words from them, plus the theme of the current study-plan day.
 */
export function recommendTopics(recentThemes: { theme: string; weight: number }[], done: string[], n = 3): { prompt: BankPrompt; theme: string }[] {
  const out: { prompt: BankPrompt; theme: string }[] = [];
  for (const { theme } of [...recentThemes].sort((a, b) => b.weight - a.weight)) {
    const cats = themeCategories(theme);
    const candidates = SPEAKING_BANK.filter((p) => cats.includes(p.category) && !done.includes(p.id) && !out.some((o) => o.prompt.id === p.id))
      .sort((a, b) => hash(theme + a.id) - hash(theme + b.id));
    if (candidates[0]) out.push({ prompt: candidates[0], theme });
    if (out.length >= n) break;
  }
  return out;
}
