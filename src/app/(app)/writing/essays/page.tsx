import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { writingPrompts, essayGuides, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { UnfinishedEssays } from "@/components/UnfinishedEssays";
import { EssayBank, type EssayCard } from "@/components/EssayBank";

export const metadata = { title: "Essay Writing" };

export default function EssayWriting() {
  const cards: EssayCard[] = writingPrompts.map((p) => ({ slug: p.slug, title: p.title, prompt: p.prompt, level: p.level, genre: p.genre, themes: p.topics.map((t) => ({ slug: t, title: getTheme(t)?.title ?? t })) }));
  return (
    <>
      <Link href="/writing" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink" data-testid="back-link"><ArrowLeft size={15} aria-hidden="true" /> Academic Writing</Link>
      <PageHeader eyebrow="Academic Writing" title="Essay Writing"
        intro={<>Choose an essay type, then a question. {cards.length} original questions, each with a planning structure, vocabulary, linking expressions and detailed AI feedback on every criterion, including punctuation.</>}>
        <Link href="/writing/portfolio" className="btn btn-ghost"><FolderOpen size={16} aria-hidden="true" /> My writing portfolio</Link>
      </PageHeader>
      <UnfinishedEssays titles={Object.fromEntries(writingPrompts.map((p) => [p.slug, p.title]))} />
      <Suspense><EssayBank cards={cards} guides={essayGuides} /></Suspense>
    </>
  );
}
