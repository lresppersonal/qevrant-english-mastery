import Link from "next/link";
import { grammarLessons, grammarDomains, getExercise, LEVEL_ORDER } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { MasteryChip } from "@/components/MasteryChip";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Grammar practice" };

export default function GrammarPracticeHub() {
  const rows = grammarLessons.map((l) => {
    const qs = l.exercises.flatMap((s) => getExercise(s)?.questions ?? []);
    const levels = [...new Set(qs.map((q) => q.level ?? l.level))].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b));
    const domain = grammarDomains.find((d) => d.key === l.domain);
    return { l, count: qs.length, levels, domain };
  }).sort((a, b) => (a.domain?.number ?? 99) - (b.domain?.number ?? 99));
  const total = rows.reduce((n, r) => n + r.count, 0);
  return (
    <>
      <PageHeader eyebrow="Learn" title="Grammar practice"
        intro={<>{total} original exercises across {rows.length} topics, in multiple-choice, gap-fill, transformation, error-correction, rewriting and in-context formats, graded from B2 to C2. Every answer explains the rule and links back to the theory.</>} />
      <ul className="card divide-y divide-line">
        {rows.map(({ l, count, levels, domain }) => (
          <li key={l.slug}>
            <Link href={`/grammar/${l.slug}/practice`} className="flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-surface-2">
              <span className="w-8 font-display text-sm font-bold text-muted">{String(domain?.number ?? "").padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-sm text-muted">{domain?.title} · {count} questions</span>
              </span>
              <span className="flex gap-1">{levels.map((lv) => <LevelBadge key={lv} level={lv} />)}</span>
              <MasteryChip target={l.slug} />
              <ArrowRight size={16} className="text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
