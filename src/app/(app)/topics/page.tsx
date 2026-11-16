import Link from "next/link";
import { topics } from "@/lib/content";
import { PageHeader } from "@/components/ui";
import { ArrowRight } from "lucide-react";

export const metadata = { title: "Topics" };

export default function Topics() {
  return (
    <>
      <PageHeader eyebrow="Learn" title="Topics" intro="Each topic hub gathers the grammar, vocabulary, texts and speaking and writing tasks that belong to it, filtered by level." />
      <ul className="grid gap-4 sm:grid-cols-2">
        {topics.map((t) => (
          <li key={t.slug}>
            {t.available ? (
              <Link href={`/topics/${t.slug}`} className="card flex h-full flex-col p-5 hover:border-primary">
                <span className="eyebrow">{t.family}</span>
                <span className="mt-2 text-lg font-bold">{t.title}</span>
                <span className="mt-1 flex-1 text-muted">{t.summary}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">Open topic <ArrowRight size={15} aria-hidden="true" /></span>
              </Link>
            ) : (
              <div className="card flex h-full flex-col border-dashed p-5">
                <span className="eyebrow">{t.family}</span>
                <span className="mt-2 text-lg font-bold">{t.title}</span>
                <span className="mt-1 flex-1 text-muted">{t.summary}</span>
                <span className="chip mt-4 w-fit">In preparation</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
