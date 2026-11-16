import type { Question } from "@/lib/content/schema";

export function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[.!?]+$/, "");
}
export function isCorrect(q: Question, answer: string | number | null) {
  if (answer === null) return false;
  return q.kind === "choice" ? answer === q.answer : q.accepted.some((a) => normalise(a) === normalise(String(answer)));
}
