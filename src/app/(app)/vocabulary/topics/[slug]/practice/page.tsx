import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { themes, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { TopicModeTabs } from "@/components/TopicModeTabs";
import { TopicFlashcards } from "@/components/TopicFlashcards";

export function generateStaticParams() { return themes.map((t) => ({ slug: t.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `Flashcards · ${getTheme((await params).slug)?.title ?? "Vocabulary"}` };
}

export default async function TopicPractice({ params }: { params: Promise<{ slug: string }> }) {
  const theme = getTheme((await params).slug);
  if (!theme) notFound();
  return (
    <>
      <Link href="/vocabulary" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> All themes</Link>
      <PageHeader eyebrow={`Vocabulary · ${theme.group}`} title={`${theme.title}: flashcards`}
        intro="Recall the meaning before you turn the card, then rate how well you remembered. Your rating schedules the next review (spaced repetition), new items are introduced from easier to harder, and cards due from other topics are mixed in." />
      <TopicModeTabs theme={theme.slug} active="practice" />
      <TopicFlashcards theme={theme.slug} />
    </>
  );
}
