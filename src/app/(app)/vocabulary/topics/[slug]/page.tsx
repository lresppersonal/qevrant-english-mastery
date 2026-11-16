import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { themes, getTheme, itemsInTheme, lexClassOf, wordFamilies, distinctions, readingTexts, writingPrompts } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ThemeVocabulary, type ThemeEntry } from "@/components/ThemeVocabulary";

export function generateStaticParams() {
  return themes.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: `${getTheme((await params).slug)?.title ?? "Theme"} · Vocabulary` };
}

export default async function ThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const theme = getTheme((await params).slug);
  if (!theme) notFound();
  const entries: ThemeEntry[] = itemsInTheme(theme.slug).flatMap((item) =>
    item.senses.filter((s) => s.topics.includes(theme.slug)).map((s) => ({
      slug: item.slug, senseId: s.id, lemma: item.lemma, lexClass: lexClassOf(item), pos: item.pos, subtopic: item.subtopic ?? "Core vocabulary",
      level: s.level, register: s.register, academic: s.academic, definition: s.definition, ru: s.translations.ru, example: s.examples[0],
      collocations: s.collocations, synonyms: s.synonyms, primary: s.topics[0] === theme.slug, attested: item.attestedIn.length > 0,
    })),
  ).sort((a, b) => a.lemma.localeCompare(b.lemma));
  const texts = readingTexts.filter((r) => (r.category ?? r.topics[0]) === theme.slug).length;
  const essays = writingPrompts.filter((p) => p.topics.includes(theme.slug)).length;
  return (
    <>
      <Link href="/vocabulary" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> All themes</Link>
      <PageHeader eyebrow={`Vocabulary · ${theme.group}`} title={theme.title} intro={theme.summary}>
        <Link href={`/topics/${theme.slug}`} className="btn btn-ghost">Theme hub{texts + essays ? ` · ${texts} ${texts === 1 ? "text" : "texts"}, ${essays} ${essays === 1 ? "essay" : "essays"}` : ""}</Link>
      </PageHeader>
      <ThemeVocabulary entries={entries} families={wordFamilies.filter((f) => f.theme === theme.slug)} distinctions={distinctions.filter((d) => d.theme === theme.slug)} />
    </>
  );
}
