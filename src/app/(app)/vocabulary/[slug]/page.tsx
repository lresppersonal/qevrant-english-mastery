import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { vocabItems, getVocabItem, readingTexts, getTheme, LEX_CLASSES, lexClassOf } from "@/lib/content";
import { ItemHeader, SenseBlock } from "@/components/SenseCard";

export function generateStaticParams() {
  return vocabItems.map((v) => ({ slug: v.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getVocabItem((await params).slug)?.lemma ?? "Vocabulary" };
}

export default async function VocabEntry({ params }: { params: Promise<{ slug: string }> }) {
  const item = getVocabItem((await params).slug);
  if (!item) notFound();
  const forms = [item.lemma, ...item.forms].map((f) => f.toLowerCase());
  const appearsIn = readingTexts.filter((r) => r.paragraphs.some((p) => forms.some((f) => new RegExp(`\\b${f.replace(/[-]/g, "\\-")}\\b`, "i").test(p))));

  return (
    <article className="max-w-3xl">
      <Link href="/vocabulary" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Vocabulary</Link>
      <h1 className="sr-only">{item.lemma}</h1>
      <ItemHeader item={item} />
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="chip">{LEX_CLASSES.find((c) => c.key === lexClassOf(item))?.label.replace(/s$/, "")}</span>
        {[...new Set(item.senses.flatMap((s) => s.topics))].map((t) => (
          <Link key={t} href={`/vocabulary/topics/${t}`} className="chip hover:border-primary hover:text-primary">{getTheme(t)?.title ?? t}</Link>
        ))}
        {item.subtopic && <span className="text-muted">Subtopic: {item.subtopic}</span>}
      </p>
      {item.family.length > 0 && (
        <p className="mt-2 text-[15px]"><span className="font-semibold text-muted">Word family: </span>{item.family.map((f) => `${f.form} (${f.pos})`).join(" · ")}</p>
      )}
      <div className="mt-6 space-y-4">
        {item.senses.map((s, i) => (
          <section key={s.id} id={s.id} className="card scroll-mt-24 p-5 sm:p-6">
            {item.senses.length > 1 && <p className="eyebrow mb-3">Sense {i + 1}</p>}
            <SenseBlock item={item} sense={s} headingLevel={2} />
          </section>
        ))}
      </div>
      {appearsIn.length > 0 && (
        <p className="mt-6 text-[15px]"><span className="font-semibold text-muted">Appears in: </span>
          {appearsIn.map((r) => <Link key={r.slug} href={`/reading/${r.slug}`} className="font-medium text-primary underline-offset-4 hover:underline">{r.title}</Link>)}
        </p>
      )}
    </article>
  );
}
