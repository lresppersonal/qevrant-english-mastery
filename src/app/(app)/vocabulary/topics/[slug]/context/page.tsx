import Link from "next/link";
import { BackLink } from "@/components/NavMemory";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { themes, getTheme } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { TopicModeTabs } from "@/components/TopicModeTabs";
import { ContextPractice } from "@/components/ContextPractice";

export function generateStaticParams() { return themes.map((t) => ({ slug: t.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `In context · ${getTheme((await params).slug)?.title ?? "Vocabulary"}` };
}

export default async function TopicContext({ params }: { params: Promise<{ slug: string }> }) {
  const theme = getTheme((await params).slug);
  if (!theme) notFound();
  return (
    <>
      <BackLink href="/vocabulary" label="All themes" />
      <PageHeader eyebrow={`Vocabulary · ${theme.group}`} title={`${theme.title}: in context`}
        intro="Recognise and use the vocabulary in real sentences: gap filling, multiple choice, the right form, meaning in context and your own sentence. Words you have already studied come first." />
      <TopicModeTabs theme={theme.slug} active="context" />
      <ContextPractice theme={theme.slug} />
    </>
  );
}
