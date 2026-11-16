"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Clock } from "lucide-react";
import { LEVELS, type Level } from "@/lib/content/schema";
import { LevelBadge, EmptyState } from "./ui";

export interface ReadingCard { slug: string; title: string; standfirst: string; level: Level; minutes: number; category: string; categoryTitle: string; tasks: string[]; questions: number }

export function ReadingLibrary({ cards }: { cards: ReadingCard[] }) {
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const cats = useMemo(() => [...new Map(cards.map((c) => [c.category, c.categoryTitle])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [cards]);
  const shown = cards.filter((c) => (cat === "all" || c.category === cat) && (level === "all" || c.level === level));
  const chip = (on: boolean) => clsx("rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink");
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label htmlFor="cat" className="text-sm font-semibold">Topic</label>
        <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input !w-auto !py-1.5 text-sm">
          <option value="all">All topics ({cards.length})</option>
          {cats.map(([k, t]) => <option key={k} value={k}>{t} ({cards.filter((c) => c.category === k).length})</option>)}
        </select>
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <div role="group" aria-label="Filter by level" className="flex flex-wrap gap-2">
          {(["all", ...LEVELS] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>{l === "all" ? "All levels" : l}</button>)}
        </div>
      </div>
      <p className="mb-4 text-sm text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "text" : "texts"}</p>
      {shown.length === 0 ? <EmptyState title="No texts match" body="Try another topic or level." /> : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="reading-list">
          {shown.map((r) => (
            <li key={r.slug}>
              <Link href={`/reading/${r.slug}`} className="card flex h-full flex-col p-6 hover:border-primary">
                <div className="flex flex-wrap items-center gap-2"><LevelBadge level={r.level} /><span className="chip"><Clock size={12} aria-hidden="true" />{r.minutes} min</span><span className="chip">{r.categoryTitle}</span></div>
                <h2 className="mt-4 text-xl font-bold">{r.title}</h2>
                <p className="mt-2 flex-1 text-muted">{r.standfirst}</p>
                <p className="mt-3 text-xs text-muted">{r.questions} questions · {r.tasks.join(" · ")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
