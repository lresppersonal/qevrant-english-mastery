import { notFound } from "next/navigation";
import { themes, getTheme, grammarLessons, itemsInTheme, lexClassOf, readingTexts, exercises, speakingPrompts, writingPrompts } from "@/lib/content";
import { TopicHub } from "@/components/TopicHub";
import { listeningForTheme, THEME_LISTENING } from "@/lib/listening";

export function generateStaticParams() {
  return themes.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getTheme((await params).slug)?.title ?? "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const theme = getTheme((await params).slug);
  if (!theme) notFound();
  const has = (t: string[]) => t.includes(theme.slug);
  return (
    <TopicHub
      theme={theme}
      lessons={grammarLessons.filter((l) => has(l.topics) && (l.slug === "relative-clauses" || l.slug === "nominal-relative-clauses"))}
      senses={itemsInTheme(theme.slug).flatMap((item) => item.senses.filter((s) => has(s.topics)).map((sense) => ({ slug: item.slug, lemma: item.lemma, id: sense.id, level: sense.level, lexClass: lexClassOf(item) })))}
      texts={readingTexts.filter((r) => (r.category ?? r.topics[0]) === theme.slug)}
      exercises={exercises.filter((e) => e.skill === "vocabulary" && has(e.topics))}
      speaking={speakingPrompts.filter((p) => has(p.topics))}
      writing={writingPrompts.filter((p) => has(p.topics))}
      listening={listeningForTheme(theme.slug)}
      listeningTopic={THEME_LISTENING[theme.slug]?.[0] ?? null}
    />
  );
}
