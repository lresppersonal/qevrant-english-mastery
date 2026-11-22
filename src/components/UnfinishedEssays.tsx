"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PenLine } from "lucide-react";
import type { EssayDraft, WritingSubmission } from "@/lib/store/types";
import { countWords } from "@/lib/ai/schemas";
import { writingTitle, writingHref } from "@/lib/writing-task";
import { useLearner } from "./StoreProvider";

/** Drafts in progress and essays waiting for (another) assessment attempt. */
export function UnfinishedEssays({ titles }: { titles: Record<string, string> }) {
  const { store, ready } = useLearner();
  const [drafts, setDrafts] = useState<EssayDraft[]>([]);
  const [failed, setFailed] = useState<WritingSubmission[]>([]);
  useEffect(() => {
    if (!ready) return;
    store.listDrafts().then(setDrafts).catch(() => {});
    store.listWriting().then((w) => setFailed(w.filter((x) => x.status === "failed" || x.status === "pending"))).catch(() => {});
  }, [ready, store]);
  if (!drafts.length && !failed.length) return null;
  return (
    <section className="card mb-8 p-5" aria-labelledby="h-unfinished" data-testid="unfinished-essays">
      <h2 id="h-unfinished" className="flex items-center gap-2 text-lg font-bold"><PenLine size={18} aria-hidden="true" /> Your unfinished essays</h2>
      <ul className="mt-3 divide-y divide-line">
        {drafts.map((d) => {
          const title = titles[d.promptSlug];
          return <li key={d.promptSlug} className="py-2"><Link href={writingHref(d.promptSlug)} className="font-medium text-primary hover:underline">{title ?? writingTitle(d.promptSlug)}</Link> <span className="text-sm text-muted">· draft, {countWords(d.body)} words · {new Date(d.updatedAt).toLocaleString()}</span></li>;
        })}
        {failed.map((w) => {
          const title = titles[w.promptSlug];
          return <li key={w.id} className="py-2"><Link href={writingHref(w.promptSlug)} className="font-medium text-primary hover:underline">{title ?? writingTitle(w.promptSlug)}</Link> <span className="text-sm text-danger">· saved, waiting for assessment — open it and press Retry</span></li>;
        })}
      </ul>
    </section>
  );
}
