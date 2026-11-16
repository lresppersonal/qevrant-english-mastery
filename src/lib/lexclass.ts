export const LEX_CLASSES = [
  { key: "noun", label: "Nouns" }, { key: "verb", label: "Verbs" }, { key: "adjective", label: "Adjectives" }, { key: "adverb", label: "Adverbs" },
  { key: "collocation", label: "Collocations" }, { key: "phrasal_verb", label: "Phrasal verbs" }, { key: "idiom", label: "Idioms" }, { key: "fixed_expression", label: "Fixed expressions" },
] as const;
export type LexClass = (typeof LEX_CLASSES)[number]["key"];
