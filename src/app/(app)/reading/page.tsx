import { ContextBackLink } from "@/components/NavMemory";
import { readingTexts, getExercise, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ReadingLibrary, type ReadingCard } from "@/components/ReadingLibrary";

export const metadata = { title: "Reading" };

export default function Reading() {
  const cards: ReadingCard[] = readingTexts.map((r) => {
    const cat = r.category ?? r.topics[0];
    return {
      slug: r.slug, title: r.title, standfirst: r.standfirst, level: r.level, minutes: r.minutes, category: cat, categoryTitle: getTheme(cat)?.title ?? cat,
      tasks: r.exercises.map((e) => getExercise(e)?.title ?? "").filter(Boolean),
      questions: r.exercises.reduce((n, e) => n + (getExercise(e)?.questions.length ?? 0), 0),
    };
  });
  return (
    <>
      <ContextBackLink />
      <PageHeader eyebrow="Learn" title="Reading library"
        intro={<>{cards.length} original articles for B2–C2 learners, with IELTS-style tasks (True/False/Not given, matching headings, matching information, sentence and summary completion, short answers, multiple choice), key vocabulary and critical-thinking questions. Tap any word for its meaning.</>} />
      <ReadingLibrary cards={cards} />
    </>
  );
}
