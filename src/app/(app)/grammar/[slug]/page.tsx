import { notFound } from "next/navigation";
import { grammarLessons, getLesson, getExercise } from "@/lib/content";
import { LessonView } from "@/components/LessonView";

export function generateStaticParams() {
  return grammarLessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const l = getLesson((await params).slug);
  return { title: l?.title ?? "Grammar" };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = getLesson((await params).slug);
  if (!lesson) notFound();
  const exercises = lesson.exercises.map((s) => getExercise(s)!).filter(Boolean);
  return <LessonView lesson={lesson} exercises={exercises} />;
}
