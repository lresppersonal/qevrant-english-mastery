"use client";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import { Clock } from "lucide-react";
import { READING_LEVELS as LEVELS, type ReadingLevel as Level } from "@/lib/content/schema";
import { LevelBadge, EmptyState } from "./ui";
import { READING_AREAS, areaOfTheme } from "@/lib/reading-areas";

export interface ReadingCard { slug: string; title: string; standfirst: string; level: Level; minutes: number; category: string; categoryTitle: string; tasks: string[]; questions: number }

export function ReadingLibrary({ cards }: { cards: ReadingCard[] }) {
  const [cat, setCat] = useState("all");
  const [level, setLevel] = useState<Level | "all">("all");
  const shown = cards.filter((c) => (cat === "all" || areaOfTheme(c.category).key === cat) && (level === "all" || c.level === level));
  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-3" data-testid="reading-filters">
        <div className="text-sm"><label htmlFor="cat" className="mb-1 block font-semibold">Subject area</label>
          <select id="cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input !w-auto !py-1.5 text-sm">
            <option value="all">All areas ({cards.length})</option>
            {READING_AREAS.map((a) => <option key={a.key} value={a.key}>{a.title} ({cards.filter((c) => areaOfTheme(c.category).key === a.key).length})</option>)}
          </select>
        </div>
        <div className="text-sm"><label htmlFor="rlevel" className="mb-1 block font-semibold">Level</label>
          <select id="rlevel" value={level} onChange={(e) => setLevel(e.target.value as Level | "all")} className="input !w-auto !py-1.5 text-sm">
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l === "B1" ? "B1 (supplementary)" : l}</option>)}
          </select>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "text" : "texts"}</p>
      {shown.length === 0 ? <EmptyState title="No texts match" body="Try another topic or level." /> : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="reading-list">
          {shown.map((r) => (
            <li key={r.slug}>
              <Link href={`/reading/${r.slug}`} className="card card-link flex h-full flex-col p-6 ">
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
