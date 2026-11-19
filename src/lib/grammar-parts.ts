import type { GrammarLesson } from "@/lib/content/schema";

export type Part = { key: string; title: string; hint: string; sections: GrammarLesson["sections"] };

/**
 * The theory follows one teaching sequence: what the structure means → when and why → how it is formed →
 * examples in context → comparison with similar forms → typical mistakes → register → C1–C2 nuance →
 * a quick recall check. Parts with no content are skipped.
 */
const PARTS: { key: string; title: string; hint: string; kinds: string[] }[] = [
  { key: "A", title: "Core concept", hint: "What the structure expresses", kinds: ["core", "theory"] },
  { key: "B", title: "When and why we use it", hint: "Situations, meanings and signals", kinds: ["overview", "uses", "time"] },
  { key: "C", title: "Formation", hint: "How the sentence is built", kinds: ["form"] },
  { key: "D", title: "Examples in context", hint: "Real communication, explained", kinds: ["examples"] },
  { key: "E", title: "Comparison", hint: "Forms that are easy to confuse", kinds: ["contrasts"] },
  { key: "F", title: "Common mistakes", hint: "Incorrect → correct → why", kinds: ["errors"] },
  { key: "G", title: "Register and style", hint: "Formal, informal, spoken and written", kinds: ["register", "pronunciation"] },
  { key: "H", title: "Going further", hint: "Nuance at C1–C2", kinds: ["advanced"] },
  { key: "I", title: "Quick check", hint: "Summary and active recall", kinds: ["summary"] },
];

export function buildParts(lesson: GrammarLesson): Part[] {
  return PARTS.map((p) => ({ key: p.key, title: p.title, hint: p.hint, sections: lesson.sections.filter((s) => p.kinds.includes(s.kind)) }))
    .filter((p) => p.sections.length > 0 || (p.key === "I" && lesson.check.length > 0));
}

