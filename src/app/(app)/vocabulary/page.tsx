import Link from "next/link";
import { themes, itemsInTheme, vocabItems, allSenses, LEVEL_ORDER } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Vocabulary" };

export default function Vocabulary() {
  const groups = [...new Set(themes.map((t) => t.group))];
  return (
    <>
      <PageHeader eyebrow="Learn" title="Vocabulary by theme"
        intro={<>One unified database of {vocabItems.length} words and expressions ({allSenses().length} senses), organised by theme. Every entry keeps its CEFR level, part of speech, register, Russian translation and examples. Words that belong to several themes are tagged, not duplicated.</>} />
      {groups.map((g) => (
        <section key={g} className="mb-8" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="eyebrow mb-3">{g}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.filter((t) => t.group === g).map((t) => {
              const items = itemsInTheme(t.slug);
              const byLevel = LEVEL_ORDER.map((l) => [l, items.filter((i) => i.senses.some((s) => s.level === l && s.topics.includes(t.slug))).length] as const);
              return (
                <li key={t.slug}>
                  <Link href={`/vocabulary/topics/${t.slug}`} className="card flex h-full flex-col p-4 hover:border-primary">
                    <span className="flex items-start gap-2"><span className="flex-1 font-display text-[17px] font-bold">{t.title}</span><ArrowRight size={16} className="mt-1 text-muted" aria-hidden="true" /></span>
                    <span className="mt-1 text-sm text-muted">{t.summary}</span>
                    <span className="mt-3 text-sm font-semibold">{items.length} entries</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted" aria-label="Entries by CEFR level">
                      {byLevel.filter(([, n]) => n).map(([l, n]) => <span key={l}>{l}: {n}</span>)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
