import { Suspense } from "react";
import Link from "next/link";
import { FolderOpen, BarChart3, ArrowRight } from "lucide-react";
import { writingPrompts, essayGuides, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { UnfinishedEssays } from "@/components/UnfinishedEssays";
import { EssayBank, type EssayCard } from "@/components/EssayBank";

export const metadata = { title: "Academic Writing" };

export default function WritingIndex() {
  const cards: EssayCard[] = writingPrompts.map((p) => ({ slug: p.slug, title: p.title, prompt: p.prompt, level: p.level, genre: p.genre, themes: p.topics.map((t) => ({ slug: t, title: getTheme(t)?.title ?? t })) }));
  return (
    <>
      <PageHeader eyebrow="Learn" title="Academic Writing"
        intro={<>{cards.length} original essay questions in the style of IELTS Academic Writing Task 2, organised by the eight essay types. Each task has a planning structure, vocabulary, linking expressions and ideas, and AI practice feedback linked to our grammar lessons.</>}>
        <Link href="/writing/portfolio" className="btn btn-ghost"><FolderOpen size={16} aria-hidden="true" /> My writing portfolio</Link>
      </PageHeader>
      <Link href="/writing/visual" className="card card-link enter mb-6 flex items-center gap-4 p-5" data-testid="visual-entry">
        <BarChart3 size={28} className="shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold">Visual Data Description</span><span className="block text-sm text-muted">Describe charts, tables, processes, maps and plans in a 150-word academic report, with AI feedback that checks your facts against the data.</span></span>
        <ArrowRight size={18} className="text-primary" aria-hidden="true" />
      </Link>
      <UnfinishedEssays titles={Object.fromEntries(writingPrompts.map((p) => [p.slug, p.title]))} />
      <Suspense><EssayBank cards={cards} guides={essayGuides} /></Suspense>
    </>
  );
}
