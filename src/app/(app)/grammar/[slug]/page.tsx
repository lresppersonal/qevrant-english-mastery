import { notFound } from "next/navigation";
import { grammarLessons, getLesson, getExercise, rulesFor, writingPrompts, speakingPrompts } from "@/lib/content";
import { LessonView } from "@/components/LessonView";
import { cycleInfo } from "@/lib/learning";

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
  // Longer tasks for the Produce stage: essays and speaking prompts on the lesson's topics, close to its level.
  const near = (lv: string) => Math.abs(["B2", "B2+", "C1", "C2"].indexOf(lv) - ["B2", "B2+", "C1", "C2"].indexOf(lesson.level)) <= 1;
  const tasks = [
    ...writingPrompts.filter((p) => p.topics.some((t) => lesson.topics.includes(t)) && near(p.level)).slice(0, 2).map((p) => ({ href: `/writing/${p.slug}`, title: `Essay: ${p.title}`, kind: "writing" as const })),
    ...speakingPrompts.filter((p) => p.topics.some((t) => lesson.topics.includes(t)) && near(p.level)).slice(0, 2).map((p) => ({ href: `/speaking/${p.slug}`, title: `Speaking: ${p.title}`, kind: "speaking" as const })),
  ];
  return <LessonView lesson={lesson} exercises={exercises} cycle={cycleInfo(lesson.slug)} rules={rulesFor(exercises)} tasks={tasks} />;
}
