import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exercises, getExercise } from "@/lib/content";
import { ExercisePlayer } from "@/components/ExercisePlayer";
import { LevelBadge } from "@/components/ui";

export function generateStaticParams() {
  return exercises.map((e) => ({ slug: e.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getExercise((await params).slug)?.title ?? "Practice" };
}

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const ex = getExercise((await params).slug);
  if (!ex) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/topics/education" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Education</Link>
      <div className="mb-2"><LevelBadge level={ex.level} /></div>
      <h1 className="text-3xl font-extrabold">{ex.title}</h1>
      <p className="mb-6 mt-2 text-muted">{ex.instructions}</p>
      <ExercisePlayer exercise={ex} />
    </div>
  );
}
