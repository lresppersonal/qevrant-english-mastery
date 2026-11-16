"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { EssayType, EssayTypeGuide, Level } from "@/lib/content/schema";
import { ESSAY_TYPES, LEVELS } from "@/lib/content/schema";
import { ESSAY_LABEL } from "@/lib/essay";
import { LevelBadge, EmptyState } from "./ui";

export interface EssayCard { slug: string; title: string; prompt: string; level: Level; genre: EssayType; themes: { slug: string; title: string }[] }

export function EssayBank({ cards, guides }: { cards: EssayCard[]; guides: EssayTypeGuide[] }) {
  const params = useSearchParams();
  const [type, setType] = useState<EssayType | "all">("all");
  const [theme, setTheme] = useState<string>(params.get("theme") ?? "all");
  const [level, setLevel] = useState<Level | "all">("all");
  const themeOpts = useMemo(() => [...new Map(cards.flatMap((c) => c.themes.map((t) => [t.slug, t.title] as const))).entries()].sort((a, b) => a[1].localeCompare(b[1])), [cards]);
  const shown = cards.filter((c) => (type === "all" || c.genre === type) && (theme === "all" || c.themes.some((t) => t.slug === theme)) && (level === "all" || c.level === level));
  const guide = type === "all" ? null : guides.find((g) => g.type === type);

  return (
    <>
      <div role="tablist" aria-label="Essay type" className="mb-4 flex flex-wrap gap-1.5">
        {(["all", ...ESSAY_TYPES] as const).map((t) => (
          <button key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)}
            className={clsx("rounded-lg border px-3 py-1.5 text-sm font-semibold", type === t ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
            {t === "all" ? "All types" : ESSAY_LABEL[t]} <span className="font-normal">{t === "all" ? cards.length : cards.filter((c) => c.genre === t).length}</span>
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold">Topic
          <select value={theme} onChange={(e) => setTheme(e.target.value)} className="input !w-auto !py-1.5 text-sm font-normal">
            <option value="all">All topics</option>
            {themeOpts.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">Level
          <select value={level} onChange={(e) => setLevel(e.target.value as Level | "all")} className="input !w-auto !py-1.5 text-sm font-normal">
            <option value="all">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>

      {guide && (
        <section className="card mb-6 p-5" aria-labelledby="h-guide">
          <h2 id="h-guide" className="text-lg font-bold">{guide.title}: how to approach them</h2>
          <p className="mt-1 text-sm text-muted">Recognise it: {guide.recognise}</p>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div><p className="font-semibold">Structure</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{guide.structure.map((s) => <li key={s}>{s}</li>)}</ol></div>
            <div><p className="font-semibold">Useful linking</p><ul className="mt-2 flex flex-wrap gap-1.5">{guide.linking.map((l) => <li key={l} className="chip !text-[13px]">{l}</li>)}</ul></div>
          </div>
        </section>
      )}

      <p className="mb-3 text-sm text-muted" aria-live="polite">{shown.length} {shown.length === 1 ? "question" : "questions"}</p>
      {shown.length === 0 ? <EmptyState title="No questions match" body="Try another type, topic or level." /> : (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="essay-list">
          {shown.map((p) => (
            <li key={p.slug}>
              <Link href={`/writing/${p.slug}`} className="card flex h-full flex-col p-5 hover:border-primary">
                <div className="flex flex-wrap items-center gap-2"><LevelBadge level={p.level} /><span className="chip">{ESSAY_LABEL[p.genre]}</span>{p.themes.slice(0, 2).map((t) => <span key={t.slug} className="chip">{t.title}</span>)}</div>
                <h2 className="mt-3 text-lg font-bold">{p.title}</h2>
                <p className="mt-1.5 flex-1 text-[15px] text-muted">{p.prompt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
