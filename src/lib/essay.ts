import type { EssayType } from "@/lib/content/schema";

export const ESSAY_LABEL: Record<EssayType, string> = {
  opinion: "Opinion",
  discussion: "Discussion",
  advantages_disadvantages: "Advantages and disadvantages",
  problem_solution: "Problem and solution",
  two_part: "Two-part question",
  positive_negative: "Positive or negative development",
  cause_effect: "Cause and effect",
  cause_problem_solution: "Cause, problem and solution",
};
