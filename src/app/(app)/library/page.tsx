"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Download, Trash2 } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { describeSaved, sourceLabel, isReviewable } from "@/lib/describe";
import { statusFromCard } from "@/lib/progress";
import { EmptyState, LevelBadge, PageHeader } from "@/components/ui";
import type { SavedStatus } from "@/lib/store/types";

const STATUS: Record<SavedStatus, string> = { new: "New", learning: "Learning", familiar: "Familiar", mastered: "Mastered" };

export default function LibraryPage() {
  const { saved, toggleSave } = useLearner();
  const { data } = useLearnerData();
  const [filter, setFilter] = useState<SavedStatus | "all">("all");
  const cards = useMemo(() => new Map((data?.cards ?? []).map((c) => [c.savedItemId, c])), [data]);

  const words = saved.filter(isReviewable).map((s) => ({ s, d: describeSaved(s), status: statusFromCard(cards.get(s.id)) }));
  const shown = words.filter((w) => filter === "all" || w.status === filter);
  const sections = saved.filter((s) => !isReviewable(s));

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["word", "definition", "russian", "level", "status", "context", "saved_at"], ...words.map((w) => [w.d.title, w.d.definition, w.d.ru, w.d.level, w.status, w.s.context, w.s.createdAt])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "personal-vocabulary.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader eyebrow="My study" title="Library" intro="Your Personal Vocabulary and bookmarked grammar explanations.">
        {words.length > 0 && <button onClick={exportCsv} className="btn btn-ghost"><Download size={16} aria-hidden="true" /> Export CSV</button>}
      </PageHeader>

      <h2 className="mb-3 text-xl font-bold">Personal Vocabulary <span className="text-base font-medium text-muted">({words.length})</span></h2>
      {words.length === 0 ? (
        <EmptyState title="No saved words yet" body="Use the Save button on any word, or tap a word while reading and save it with its sentence."
          action={<Link href="/vocabulary" className="btn btn-primary">Browse vocabulary</Link>} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {(["all", "new", "learning", "familiar", "mastered"] as const).map((f) => (
              <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}
                className={clsx("rounded-full border px-3 py-1.5 text-sm font-semibold", filter === f ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted")}>
                {f === "all" ? "All" : STATUS[f]} ({f === "all" ? words.length : words.filter((w) => w.status === f).length})
              </button>
            ))}
          </div>
          <ul className="card divide-y divide-line" data-testid="library-list">
            {shown.map(({ s, d, status }) => (
              <li key={s.id} className="flex items-start gap-4 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {d.href ? <Link href={d.href} className="font-display text-lg font-bold hover:text-primary">{d.title}</Link> : <span className="font-display text-lg font-bold">{d.title}</span>}
                    {d.level && <LevelBadge level={d.level} />}
                    <span className={clsx("chip", status === "mastered" && "text-success")}>{STATUS[status]}</span>
                  </div>
                  {d.definition && <p className="mt-1 text-[15px]">{d.definition}</p>}
                  {d.ru && <p lang="ru" className="text-sm text-muted">{d.ru}</p>}
                  {s.context && <p className="mt-1.5 text-sm italic text-muted">“{s.context}”{sourceLabel(s.sourceRef) && <span className="not-italic"> · {sourceLabel(s.sourceRef)}</span>}</p>}
                </div>
                <button onClick={() => toggleSave({ itemType: s.itemType, itemRef: s.itemRef, label: s.label })} className="btn btn-ghost h-9 w-9 !min-h-0 !p-0" aria-label={`Remove ${d.title}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-3 mt-10 text-xl font-bold">Bookmarked explanations <span className="text-base font-medium text-muted">({sections.length})</span></h2>
      {sections.length === 0 ? <p className="text-muted">Bookmark any section of a grammar lesson to find it here.</p> : (
        <ul className="card divide-y divide-line">
          {sections.map((s) => {
            const d = describeSaved(s);
            return (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                {d.level && <LevelBadge level={d.level} />}
                <Link href={d.href!} className="flex-1"><span className="block font-semibold hover:text-primary">{d.title}</span><span className="block text-sm text-muted">{d.definition}</span></Link>
                <button onClick={() => toggleSave({ itemType: s.itemType, itemRef: s.itemRef, label: s.label })} className="btn btn-ghost h-9 w-9 !min-h-0 !p-0" aria-label={`Remove bookmark ${d.title}`}><Trash2 size={16} aria-hidden="true" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
