import { notFound } from "next/navigation";
import { grammarLessons, getLesson, getExercise } from "@/lib/content";
import { LessonPractice } from "@/components/LessonView";

export function generateStaticParams() {
  return grammarLessons.map((l) => ({ slug: l.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `Practice: ${getLesson((await params).slug)?.title ?? "Grammar"}` };
}

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = getLesson((await params).slug);
  if (!lesson) notFound();
  return <LessonPractice lesson={lesson} exercises={lesson.exercises.map((s) => getExercise(s)!).filter(Boolean)} />;
}
