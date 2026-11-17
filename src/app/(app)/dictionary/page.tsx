import { vocabItems } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { DictionarySearch } from "@/components/DictionarySearch";

export const metadata = { title: "Dictionary" };

export default function DictionaryPage() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Dictionary" intro="Look up any English word: meaning, Russian translation, grammar, British and American pronunciation, collocations and related forms." />
      <DictionarySearch items={vocabItems} />
    </>
  );
}
