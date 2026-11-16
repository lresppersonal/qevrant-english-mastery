import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { readingTexts, getReading, getExercise, buildFormIndex, vocabItems, getTheme, getSense } from "@/lib/content";
import { LevelBadge } from "@/components/ui";
import { Reader } from "@/components/Reader";
import { ExercisePlayer } from "@/components/ExercisePlayer";
import { SaveButton } from "@/components/SaveButton";
import { CriticalThinking } from "@/components/CriticalThinking";

export function generateStaticParams() {
  return readingTexts.map((r) => ({ slug: r.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getReading((await params).slug)?.title ?? "Reading" };
}

export default async function ReadingPage({ params }: { params: Promise<{ slug: string }> }) {
  const text = getReading((await params).slug);
  if (!text) notFound();
  const exercises = text.exercises.map((e) => getExercise(e)!).filter(Boolean);
  const cat = text.category ?? text.topics[0];
  const words = text.paragraphs.join(" ").replace(/\[[A-Z]\]/g, "").split(/\s+/).filter(Boolean).length;
  return (
    <article>
      <Link href="/reading" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Reading library</Link>
      <header className="mb-6 max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <LevelBadge level={text.level} /><span className="chip"><Clock size={12} aria-hidden="true" />{text.minutes} min · {words} words</span>
          <Link href={`/topics/${cat}`} className="chip hover:border-primary hover:text-primary">{getTheme(cat)?.title ?? cat}</Link>
        </div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">{text.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{text.standfirst}</p>
      </header>

      {text.keyVocabulary.length > 0 && (
        <details className="card mb-6 p-5" open>
          <summary className="cursor-pointer text-lg font-bold">Key vocabulary <span className="text-sm font-medium text-muted">({text.keyVocabulary.length}) · read these first</span></summary>
          <ul className="mt-3 grid gap-x-6 gap-y-2 md:grid-cols-2">
            {text.keyVocabulary.map((k) => {
              const ref = k.sense ? getSense(k.sense) : undefined;
              return (
                <li key={k.term} className="flex items-start gap-2 text-[15px]">
                  <span className="min-w-0 flex-1">
                    {ref ? <Link href={`/vocabulary/${ref.item.slug}#${ref.sense.id}`} className="font-semibold text-primary hover:underline">{k.term}</Link> : <strong>{k.term}</strong>}
                    {" "}<span className="text-muted">{k.definition}</span> · <span lang="ru">{k.ru}</span>
                  </span>
                  {ref ? <SaveButton compact itemType="sense" itemRef={ref.sense.id} label={ref.item.lemma} sourceRef={`reading:${text.slug}`} />
                    : <SaveButton compact itemType="custom" itemRef={k.term.toLowerCase()} label={k.term} context={k.definition} sourceRef={`reading:${text.slug}`} />}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Reader text={text} forms={buildFormIndex()} items={vocabItems} />

      {text.expressions.length > 0 && (
        <section className="card mt-6 p-5" aria-labelledby="h-expr">
          <h2 id="h-expr" className="text-lg font-bold">Useful expressions from the text</h2>
          <ul className="mt-3 space-y-1.5 text-[15px]">{text.expressions.map((e) => <li key={e.phrase}><strong>{e.phrase}</strong> <span className="text-muted">= {e.meaning}</span></li>)}</ul>
        </section>
      )}

      {exercises.map((ex, i) => (
        <section key={ex.slug} className="mt-10" aria-labelledby={`ex-${ex.slug}`}>
          <p className="eyebrow">Task {i + 1} of {exercises.length}</p>
          <h2 id={`ex-${ex.slug}`} className="text-xl font-bold">{ex.title}</h2>
          <p className="mb-4 mt-1 text-muted">{ex.instructions}</p>
          <ExercisePlayer exercise={ex} />
        </section>
      ))}

      {text.critical.length > 0 && <CriticalThinking items={text.critical} />}
    </article>
  );
}
