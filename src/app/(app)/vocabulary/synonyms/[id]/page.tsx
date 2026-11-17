import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SYNONYM_GROUPS, getSynGroup, allSynExercises } from "@/lib/synonyms";
import { PageHeader, Rich } from "@/components/ui";
import { SynonymExercises } from "@/components/SynonymExercises";

export function generateStaticParams() { return SYNONYM_GROUPS.map((g) => ({ id: g.id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `${getSynGroup((await params).id)?.headword ?? "Synonyms"} · Synonyms` };
}

export default async function SynonymGroup({ params }: { params: Promise<{ id: string }> }) {
  const g = getSynGroup((await params).id);
  if (!g) notFound();
  return (
    <>
      <Link href="/vocabulary/synonyms" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic & Advanced Synonyms</Link>
      <PageHeader eyebrow={`Synonyms · ${g.category}`} title={`Instead of “${g.headword}”`} intro={g.summary} />
      <div className="grid gap-3 md:grid-cols-2" data-testid="synonym-members">
        {g.members.map((m) => (
          <article key={m.word} className="card p-5">
            <p className="flex flex-wrap items-baseline gap-2"><span className="font-display text-xl font-extrabold">{m.word}</span><span className="chip">{m.register}</span></p>
            <p className="mt-1.5">{m.meaning}</p>
            <p className="mt-2 text-sm"><span className="font-semibold">Collocations: </span>{m.collocations.join(" · ")}</p>
            <p className="mt-1 text-sm"><span className="font-semibold">Grammar: </span><Rich text={m.grammar} /></p>
            <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-[15px] italic">{m.example}</p>
          </article>
        ))}
      </div>
      <div className="card mt-4 border-l-4 !border-l-primary p-5 text-[15px]"><span className="font-semibold">Are they interchangeable? </span><Rich text={g.note} /></div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Practise choosing in context</h2>
      <SynonymExercises exercises={allSynExercises().filter((e) => e.group === g.id)} slug={`synonyms-${g.id}`} />
    </>
  );
}
