import Link from "next/link";
import { themes, itemsInTheme, vocabItems, allSenses, LEVEL_ORDER } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ArrowRight, Layers, TextQuote, Shuffle, ChevronDown } from "lucide-react";

export const metadata = { title: "Vocabulary" };

export default function Vocabulary() {
  const groups = [...new Set(themes.map((t) => t.group))];
  return (
    <>
      <PageHeader eyebrow="Learn" title="Vocabulary by theme"
        intro={<>One unified database of {vocabItems.length} words and expressions ({allSenses().length} senses), organised by theme. Every topic has a vocabulary list, flashcards with spaced repetition and practice in context.</>}>
        <Link href="/vocabulary/synonyms" className="btn btn-ghost border border-line"><Shuffle size={16} aria-hidden="true" /> Academic & Advanced Synonyms</Link>
      </PageHeader>
      {groups.map((g) => (
        <section key={g} className="mb-8" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="eyebrow mb-3">{g}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {themes.filter((t) => t.group === g).map((t) => {
              const items = itemsInTheme(t.slug);
              const byLevel = LEVEL_ORDER.map((l) => [l, items.filter((i) => i.senses.some((s) => s.level === l && s.topics.includes(t.slug))).length] as const);
              return (
                <li key={t.slug} className="card card-link flex h-full flex-col p-4" data-testid={`topic-${t.slug}`}>
                  <div className="flex items-start gap-2">
                    <Link href={`/vocabulary/topics/${t.slug}`} className="flex-1 font-display text-[17px] font-bold hover:text-primary">{t.title}</Link>
                    <Link href={`/vocabulary/topics/${t.slug}/practice`} className="btn btn-primary !min-h-8 shrink-0 !px-2.5 !py-1 text-xs" aria-label={`Practise ${t.title} with flashcards`}><Layers size={13} aria-hidden="true" /> Practice</Link>
                  </div>
                  <span className="mt-1 text-sm text-muted">{t.summary}</span>
                  <details className="group mt-3 text-sm">
                    <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-muted hover:text-ink">Topic stats <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
                    <p className="mt-1">{items.length} entries</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted" aria-label="Entries by CEFR level">
                      {byLevel.filter(([, n]) => n).map(([l, n]) => <span key={l}>{l}: {n}</span>)}
                    </p>
                  </details>
                  <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-sm font-semibold">
                    <Link href={`/vocabulary/topics/${t.slug}`} className="inline-flex items-center gap-1 text-primary hover:underline">List <ArrowRight size={13} aria-hidden="true" /></Link>
                    <Link href={`/vocabulary/topics/${t.slug}/context`} className="inline-flex items-center gap-1 text-primary hover:underline"><TextQuote size={13} aria-hidden="true" /> In context</Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
