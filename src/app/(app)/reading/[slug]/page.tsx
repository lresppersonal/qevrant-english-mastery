import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { readingTexts, getReading, getExercise, buildFormIndex, vocabItems } from "@/lib/content";
import { LevelBadge } from "@/components/ui";
import { Reader } from "@/components/Reader";
import { ExercisePlayer } from "@/components/ExercisePlayer";

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
  return (
    <article>
      <Link href="/reading" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Reading</Link>
      <header className="mb-6 max-w-3xl">
        <div className="mb-3 flex items-center gap-2"><LevelBadge level={text.level} /><span className="chip"><Clock size={12} aria-hidden="true" />{text.minutes} min</span></div>
        <h1 className="text-3xl font-extrabold leading-tight md:text-5xl">{text.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">{text.standfirst}</p>
      </header>
      <Reader text={text} forms={buildFormIndex()} items={vocabItems} />
      {exercises.map((ex) => (
        <section key={ex.slug} className="mt-10" aria-labelledby={`ex-${ex.slug}`}>
          <h2 id={`ex-${ex.slug}`} className="text-xl font-bold">Check your understanding</h2>
          <p className="mb-4 mt-1 text-muted">{ex.instructions}</p>
          <ExercisePlayer exercise={ex} />
        </section>
      ))}
    </article>
  );
}
