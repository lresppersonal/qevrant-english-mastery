import { Suspense } from "react";
import { writingPrompts, essayGuides, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { EssayBank, type EssayCard } from "@/components/EssayBank";

export const metadata = { title: "Academic Writing" };

export default function WritingIndex() {
  const cards: EssayCard[] = writingPrompts.map((p) => ({ slug: p.slug, title: p.title, prompt: p.prompt, level: p.level, genre: p.genre, themes: p.topics.map((t) => ({ slug: t, title: getTheme(t)?.title ?? t })) }));
  return (
    <>
      <PageHeader eyebrow="Learn" title="Academic Writing"
        intro={<>{cards.length} original essay questions in the style of IELTS Academic Writing Task 2, organised by the eight essay types. Each task has a planning structure, vocabulary, linking expressions and ideas, and AI practice feedback linked to our grammar lessons.</>} />
      <Suspense><EssayBank cards={cards} guides={essayGuides} /></Suspense>
    </>
  );
}
