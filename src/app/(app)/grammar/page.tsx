import Link from "next/link";
import { grammarDomains, getLesson } from "@/lib/content";
import { PageHeader, LevelBadge } from "@/components/ui";
import { MasteryChip } from "@/components/MasteryChip";

export const metadata = { title: "Grammar" };

export default function GrammarMap() {
  const published = grammarDomains.flatMap((d) => d.topics).filter((t) => t.lesson).length;
  const total = grammarDomains.flatMap((d) => d.topics).length;
  return (
    <>
      <PageHeader eyebrow="Learn" title="Grammar map"
        intro={<>18 areas of advanced grammar, each running from B2 to C1/C2, consolidated from the reference course books. {published} of {total} subtopics have full theory and practice; the rest are marked as planned.</>}>
        <Link href="/grammar/practice" className="btn btn-primary">All practice sets</Link>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {grammarDomains.map((d) => (
          <section key={d.key} id={d.key} className="card scroll-mt-24 p-5">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm font-bold text-muted">{String(d.number).padStart(2, "0")}</span>
              <h2 className="text-lg font-bold">{d.title}</h2>
            </div>
            <p className="mt-1 text-sm text-muted">{d.description}</p>
            <ol className="mt-4 space-y-1.5">
              {d.topics.map((t) => {
                const lesson = t.lesson ? getLesson(t.lesson) : undefined;
                return (
                  <li key={t.title}>
                    {lesson ? (
                      <Link href={`/grammar/${lesson.slug}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 font-medium text-primary hover:bg-surface-2">
                        <LevelBadge level={t.level} />
                        <span className="flex-1 underline-offset-4 hover:underline">{t.title}</span>
                        <MasteryChip target={lesson.slug} />
                      </Link>
                    ) : (
                      <span className="flex items-center gap-3 px-2 py-1.5 text-muted">
                        <LevelBadge level={t.level} />
                        <span className="flex-1">{t.title}</span>
                        <span className="text-xs">Planned</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </>
  );
}
