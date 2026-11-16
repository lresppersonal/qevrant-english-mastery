import { notFound } from "next/navigation";
import { writingPrompts, getWritingPrompt } from "@/lib/content";
import { EssayWorkspace } from "@/components/EssayWorkspace";

export function generateStaticParams() {
  return writingPrompts.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getWritingPrompt((await params).slug)?.title ?? "Academic Writing" };
}

export default async function WritingTask({ params }: { params: Promise<{ slug: string }> }) {
  const prompt = getWritingPrompt((await params).slug);
  if (!prompt) notFound();
  return <EssayWorkspace prompt={prompt} />;
}
