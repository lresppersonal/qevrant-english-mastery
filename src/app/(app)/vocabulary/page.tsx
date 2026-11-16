import { vocabItems } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { VocabBrowser } from "@/components/VocabBrowser";

export const metadata = { title: "Vocabulary" };

export default function Vocabulary() {
  const senses = vocabItems.reduce((n, v) => n + v.senses.length, 0);
  return (
    <>
      <PageHeader eyebrow="Learn" title="Vocabulary"
        intro={<>Each word appears once, with separate senses for each level. {vocabItems.length} items and {senses} senses are published, all in the Education topic so far.</>} />
      <VocabBrowser items={vocabItems} />
    </>
  );
}
