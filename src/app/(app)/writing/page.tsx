import { ContextBackLink } from "@/components/NavMemory";
import { Suspense } from "react";
import Link from "next/link";
import { FolderOpen, BarChart3, ArrowRight, PenLine } from "lucide-react";
import { writingPrompts, essayGuides, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { UnfinishedEssays } from "@/components/UnfinishedEssays";
import { EssayBank, type EssayCard } from "@/components/EssayBank";

export const metadata = { title: "Academic Writing" };

export default function WritingIndex() {
  const cards: EssayCard[] = writingPrompts.map((p) => ({ slug: p.slug, title: p.title, prompt: p.prompt, level: p.level, genre: p.genre, themes: p.topics.map((t) => ({ slug: t, title: getTheme(t)?.title ?? t })) }));
  return (
    <>
      <ContextBackLink />
      <PageHeader eyebrow="Learn" title="Academic Writing"
        intro={<>Two kinds of academic writing, each with planning support and detailed AI feedback on every criterion, including punctuation. {cards.length} original essay questions.</>}>
        <Link href="/writing/portfolio" className="btn btn-ghost"><FolderOpen size={16} aria-hidden="true" /> My writing portfolio</Link>
      </PageHeader>
      <div className="mb-8 grid gap-4 sm:grid-cols-2" data-testid="writing-categories">
        <Link href="/writing/visual" className="card card-link enter flex items-start gap-4 p-5" data-testid="visual-entry">
          <BarChart3 size={26} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold">Visual Data Description</span><span className="block text-sm text-muted">Charts, graphs, tables, diagrams, processes, maps and combined visuals.</span></span>
          <ArrowRight size={18} className="mt-1 text-primary" aria-hidden="true" />
        </Link>
        <a href="#essays" className="card card-link enter flex items-start gap-4 p-5" data-testid="essay-entry">
          <PenLine size={26} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold">Essay Writing</span><span className="block text-sm text-muted">Eight essay types: opinion, discussion, advantages and disadvantages, problem–solution, two-part, positive/negative development, cause–effect and cause–problem–solution.</span></span>
          <ArrowRight size={18} className="mt-1 text-primary" aria-hidden="true" />
        </a>
      </div>
      <UnfinishedEssays titles={Object.fromEntries(writingPrompts.map((p) => [p.slug, p.title]))} />
      <h2 id="essays" className="mb-3 scroll-mt-24 text-xl font-bold">Essay Writing</h2>
      <Suspense><EssayBank cards={cards} guides={essayGuides} /></Suspense>
    </>
  );
}
