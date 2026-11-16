import { notFound } from "next/navigation";
import { topics, getTopic, grammarLessons, vocabItems, readingTexts, exercises, speakingPrompts, writingPrompts } from "@/lib/content";
import { TopicHub } from "@/components/TopicHub";

export function generateStaticParams() {
  return topics.filter((t) => t.available).map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getTopic((await params).slug)?.title ?? "Topic" };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const topic = getTopic((await params).slug);
  if (!topic || !topic.available) notFound();
  const has = (t: string[]) => t.includes(topic.slug);
  return (
    <TopicHub
      topic={topic}
      lessons={grammarLessons.filter((l) => has(l.topics))}
      senses={vocabItems.flatMap((item) => item.senses.filter((s) => has(s.topics)).map((sense) => ({ slug: item.slug, lemma: item.lemma, id: sense.id, level: sense.level, definition: sense.definition, ru: sense.translations.ru })))}
      texts={readingTexts.filter((r) => has(r.topics))}
      exercises={exercises.filter((e) => has(e.topics))}
      speaking={speakingPrompts.filter((p) => has(p.topics))}
      writing={writingPrompts.filter((p) => has(p.topics))}
    />
  );
}
