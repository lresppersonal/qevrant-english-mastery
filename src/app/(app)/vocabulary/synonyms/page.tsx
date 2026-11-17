import Link from "next/link";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { SYNONYM_GROUPS, SYN_CATEGORIES, allSynExercises } from "@/lib/synonyms";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Academic & Advanced Synonyms" };

export default function Synonyms() {
  return (
    <>
      <Link href="/vocabulary" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Vocabulary</Link>
      <PageHeader eyebrow="Vocabulary" title="Academic & Advanced Synonyms"
        intro={<>Near-synonyms are rarely interchangeable. Each group explains how the words differ in meaning, register, collocation and grammar, then tests the choice in context: {SYNONYM_GROUPS.length} groups, {allSynExercises().length} exercises.</>}>
        <Link href="/vocabulary/synonyms/practice" className="btn btn-primary"><Shuffle size={16} aria-hidden="true" /> Mixed practice</Link>
      </PageHeader>
      {SYN_CATEGORIES.map((c) => (
        <section key={c} className="mb-8" aria-labelledby={`c-${c}`}>
          <h2 id={`c-${c}`} className="eyebrow mb-3">{c}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SYNONYM_GROUPS.filter((g) => g.category === c).map((g) => (
              <li key={g.id}>
                <Link href={`/vocabulary/synonyms/${g.id}`} className="card card-link flex h-full flex-col p-4">
                  <span className="flex items-start gap-2"><span className="flex-1 font-display text-[17px] font-bold">{g.headword}</span><ArrowRight size={16} className="mt-1 text-muted" aria-hidden="true" /></span>
                  <span className="mt-1 text-sm text-muted">{g.members.map((m) => m.word).join(" · ")}</span>
                  <span className="mt-3 text-xs text-muted">{g.pos} · {g.exercises.length} exercises</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
