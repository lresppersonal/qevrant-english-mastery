import Link from "next/link";
import { grammarLessons, grammarDomains, getExercise, LEVEL_ORDER } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { MasteryChip } from "@/components/MasteryChip";
import { ArrowRight, Repeat, TrendingDown, Shuffle } from "lucide-react";

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
      <section aria-labelledby="smart-h" className="mb-6">
        <h2 id="smart-h" className="mb-3 text-lg font-bold">Adaptive practice</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/practice/smart?mode=mistakes", icon: Repeat, t: "My mistakes", d: "Questions you got wrong come back until you answer them correctly." },
            { href: "/practice/smart?mode=weak", icon: TrendingDown, t: "Weak areas", d: "Weighted towards the topics where your accuracy is lowest." },
            { href: "/practice/smart?mode=mixed", icon: Shuffle, t: "Mixed review", d: "Interleaved questions across topics, including ones you haven't seen for a while." },
          ].map(({ href, icon: Icon, t, d }, i) => (
            <Link key={href} href={href} className="card card-link enter p-4" style={{ "--i": i } as React.CSSProperties}>
              <Icon size={18} className="text-primary" aria-hidden="true" />
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-0.5 text-sm text-muted">{d}</p>
            </Link>
          ))}
        </div>
      </section>
      <h2 className="mb-3 text-lg font-bold">By topic</h2>
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
