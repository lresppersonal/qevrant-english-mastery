import Link from "next/link";
import { themes, itemsInTheme, readingTexts, writingPrompts } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Topics" };

export default function Topics() {
  const groups = [...new Set(themes.map((t) => t.group))];
  return (
    <>
      <PageHeader eyebrow="Learn" title="Topics" intro="Each topic hub gathers its vocabulary, reading texts, essay questions and speaking tasks in one place, with CEFR levels shown on every item." />
      {groups.map((g) => (
        <section key={g} className="mb-8">
          <h2 className="eyebrow mb-3">{g}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {themes.filter((t) => t.group === g).map((t) => {
              const v = itemsInTheme(t.slug).length;
              const r = readingTexts.filter((x) => (x.category ?? x.topics[0]) === t.slug).length;
              const w = writingPrompts.filter((x) => x.topics.includes(t.slug)).length;
              return (
                <li key={t.slug}>
                  <Link href={`/topics/${t.slug}`} className="card flex h-full flex-col p-5 hover:border-primary">
                    <span className="text-lg font-bold">{t.title}</span>
                    <span className="mt-1 flex-1 text-muted">{t.summary}</span>
                    <span className="mt-3 text-sm text-muted">{v} words · {r} {r === 1 ? "text" : "texts"} · {w} {w === 1 ? "essay" : "essays"}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open topic <ArrowRight size={15} aria-hidden="true" /></span>
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
