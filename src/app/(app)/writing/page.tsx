import { ContextBackLink } from "@/components/NavMemory";
import Link from "next/link";
import { FolderOpen, BarChart3, ArrowRight, PenLine } from "lucide-react";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Academic Writing" };

/** Academic Writing has exactly two entry points; each opens its own page. */
export default function WritingIndex() {
  return (
    <>
      <ContextBackLink />
      <PageHeader eyebrow="Learn" title="Academic Writing"
        intro="Two kinds of academic writing, each with planning support and detailed AI feedback on every criterion, including punctuation.">
        <Link href="/writing/portfolio" className="btn btn-ghost"><FolderOpen size={16} aria-hidden="true" /> My writing portfolio</Link>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2" data-testid="writing-categories">
        <Link href="/writing/visual" className="card card-link enter flex items-start gap-4 p-6" data-testid="visual-entry">
          <BarChart3 size={28} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-display text-xl font-bold">Visual Data Description</span><span className="mt-1 block text-sm text-muted">Charts, graphs, tables, diagrams, processes, maps and combined visuals.</span></span>
          <ArrowRight size={18} className="mt-1 text-primary" aria-hidden="true" />
        </Link>
        <Link href="/writing/essays" className="card card-link enter flex items-start gap-4 p-6" data-testid="essay-entry">
          <PenLine size={28} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-display text-xl font-bold">Essay Writing</span><span className="mt-1 block text-sm text-muted">Opinion, discussion, advantages and disadvantages, problem and solution, two-part, positive or negative development, cause and effect, and more.</span></span>
          <ArrowRight size={18} className="mt-1 text-primary" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}
