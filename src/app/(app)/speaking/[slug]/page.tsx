import { notFound } from "next/navigation";
import { speakingPrompts, getSpeakingPrompt } from "@/lib/content";
import { SpeakingWorkspace } from "@/components/SpeakingWorkspace";

export function generateStaticParams() {
  return speakingPrompts.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getSpeakingPrompt((await params).slug)?.title ?? "Speaking" };
}

export default async function SpeakingTask({ params }: { params: Promise<{ slug: string }> }) {
  const prompt = getSpeakingPrompt((await params).slug);
  if (!prompt) notFound();
  return <SpeakingWorkspace prompt={prompt} />;
}
