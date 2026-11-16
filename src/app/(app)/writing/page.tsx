import Link from "next/link";
import { writingPrompts } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { Clock, Sparkles } from "lucide-react";

export const metadata = { title: "Academic Writing" };

const GENRE: Record<string, string> = { opinion: "Opinion essay", discussion: "Discussion essay", problem_solution: "Problem and solution", advantages_disadvantages: "Advantages and disadvantages", two_part: "Two-part question", data_report: "Data report" };

export default function WritingIndex() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Academic Writing"
        intro={<>Argument essays of the kind used in university study and IELTS Academic Writing Task 2. Write your essay, then get detailed AI practice feedback linked to the grammar and vocabulary you need.</>} />
      <ul className="grid gap-4 md:grid-cols-2">
        {writingPrompts.map((p) => (
          <li key={p.slug}>
            <Link href={`/writing/${p.slug}`} className="card flex h-full flex-col p-6 hover:border-primary">
              <div className="flex flex-wrap items-center gap-2"><LevelBadge level={p.level} /><span className="chip">{GENRE[p.genre]}</span><span className="chip"><Clock size={12} aria-hidden="true" />{p.suggestedMinutes} min</span></div>
              <h2 className="mt-4 text-lg font-bold">{p.title}</h2>
              <p className="mt-2 flex-1 text-muted">{p.prompt}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Sparkles size={15} aria-hidden="true" /> AI practice feedback</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
