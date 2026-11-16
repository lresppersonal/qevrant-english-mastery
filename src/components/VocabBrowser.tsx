"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import type { VocabItem } from "@/lib/content/schema";
import { LEVELS } from "@/lib/content/schema";
import { LevelBadge } from "./ui";
import { useLearner } from "./StoreProvider";
import { BookmarkCheck } from "lucide-react";

const KINDS = [["all", "All types"], ["word", "Words"], ["collocation", "Collocations"], ["phrasal_verb", "Phrasal verbs"], ["idiom", "Idioms & phrases"]] as const;

export function VocabBrowser({ items }: { items: VocabItem[] }) {
  const [level, setLevel] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [academic, setAcademic] = useState(false);
  const { saved } = useLearner();
  const savedSenses = new Set(saved.filter((s) => s.itemType === "sense").map((s) => s.itemRef));

  const rows = useMemo(() => items.flatMap((item) => item.senses.map((sense) => ({ item, sense })))
    .filter(({ item, sense }) => (level === "all" || sense.level === level)
      && (kind === "all" || item.kind === kind || (kind === "idiom" && item.kind === "phrase"))
      && (!academic || sense.academic))
    .sort((a, b) => a.item.lemma.localeCompare(b.item.lemma)), [items, level, kind, academic]);

  const chip = (on: boolean) => clsx("rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink");

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by level">
        {["all", ...LEVELS].map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>{l === "all" ? "All levels" : l}</button>)}
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <label className="sr-only" htmlFor="kind">Type</label>
        <select id="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="input !w-auto !py-1.5 text-sm">
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="ml-1 inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={academic} onChange={(e) => setAcademic(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" /> Academic only
        </label>
      </div>
      <p className="mb-3 text-sm text-muted" aria-live="polite">{rows.length} senses</p>
      <ul className="card divide-y divide-line">
        {rows.map(({ item, sense }) => (
          <li key={sense.id}>
            <Link href={`/vocabulary/${item.slug}#${sense.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
              <LevelBadge level={sense.level} />
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{item.lemma}</span>
                <span className="block truncate text-sm text-muted">{sense.definition}</span>
              </span>
              <span lang="ru" className="hidden max-w-[220px] truncate text-sm text-muted md:block">{sense.translations.ru}</span>
              {savedSenses.has(sense.id) && <BookmarkCheck size={17} className="text-primary" aria-label="Saved" />}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
