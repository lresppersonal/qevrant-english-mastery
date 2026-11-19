import Link from "next/link";
import { BackLink } from "@/components/NavMemory";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exercises, getExercise, getTheme, rulesFor } from "@/lib/content";
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
      <BackLink href={ex.topics[0] && getTheme(ex.topics[0]) ? `/topics/${ex.topics[0]}` : "/vocabulary"} label={ex.topics[0] ? getTheme(ex.topics[0])?.title ?? "Vocabulary" : "Vocabulary"} />
      <div className="mb-2"><LevelBadge level={ex.level} /></div>
      <h1 className="text-3xl font-extrabold">{ex.title}</h1>
      <p className="mb-6 mt-2 text-muted">{ex.instructions}</p>
      <ExercisePlayer exercise={ex} rules={rulesFor([ex])} />
    </div>
  );
}
