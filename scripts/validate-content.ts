import { validateGraph, vocabItems, grammarLessons, exercises, readingTexts, allSenses } from "../src/lib/content";

const problems = validateGraph();
console.log(
  `Content: ${grammarLessons.length} lessons, ${vocabItems.length} vocabulary items / ${allSenses().length} senses, ` +
    `${exercises.length} exercises (${exercises.reduce((n, e) => n + e.questions.length, 0)} questions), ${readingTexts.length} reading text(s)`,
);
if (problems.length) {
  console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log("All schema and cross-reference checks passed.");
