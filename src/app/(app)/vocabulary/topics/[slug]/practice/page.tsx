import Link from "next/link";
import { BackLink } from "@/components/NavMemory";
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
      <BackLink href="/vocabulary" label="All themes" />
      <PageHeader eyebrow={`Vocabulary · ${theme.group}`} title={`${theme.title}: flashcards`}
        intro="Recall the meaning before you turn the card, then rate how well you remembered. Your rating schedules the next review (spaced repetition), new items are introduced from easier to harder, and cards due from other topics are mixed in." />
      <TopicModeTabs theme={theme.slug} active="practice" />
      <TopicFlashcards theme={theme.slug} />
    </>
  );
}
