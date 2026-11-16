"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { LEVELS, type Level } from "@/lib/content/schema";
import { LEX_CLASSES } from "@/lib/lexclass";
import { LevelBadge, Rich, EmptyState } from "./ui";
import { SaveButton } from "./SaveButton";

export interface ThemeEntry {
  slug: string; senseId: string; lemma: string; lexClass: string; pos: string; subtopic: string; level: Level; register: string;
  academic: boolean; definition: string; ru: string; example: string; collocations: string[]; synonyms: string[]; primary: boolean; attested: boolean;
}

const TABS = [
  { key: "all", label: "All" },
  ...LEX_CLASSES,
  { key: "academic", label: "Academic vocabulary" },
  { key: "formation", label: "Word formation" },
  { key: "distinctions", label: "Synonyms & distinctions" },
] as const;

export function ThemeVocabulary({ entries, families, distinctions }: {
  entries: ThemeEntry[]; families: { members: { form: string; pos: string }[] }[]; distinctions: { title: string; text: string }[];
}) {
  const [tab, setTab] = useState<string>("all");
  const [levels, setLevels] = useState<Level[]>([]);
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length, academic: entries.filter((e) => e.academic).length, formation: families.length, distinctions: distinctions.length + entries.filter((e) => e.synonyms.length).length };
    for (const l of LEX_CLASSES) c[l.key] = entries.filter((e) => e.lexClass === l.key).length;
    return c;
  }, [entries, families, distinctions]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return entries.filter((e) =>
      (tab === "all" || tab === "distinctions" || (tab === "academic" ? e.academic : e.lexClass === tab))
      && (tab !== "distinctions" || e.synonyms.length > 0)
      && (!levels.length || levels.includes(e.level))
      && (!term || `${e.lemma} ${e.definition} ${e.ru} ${e.synonyms.join(" ")} ${e.collocations.join(" ")}`.toLowerCase().includes(term)));
  }, [entries, tab, levels, q]);

  const bySubtopic = useMemo(() => {
    const m = new Map<string, ThemeEntry[]>();
    for (const e of shown) m.set(e.subtopic, [...(m.get(e.subtopic) ?? []), e]);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  const toggleLevel = (l: Level) => setLevels((ls) => (ls.includes(l) ? ls.filter((x) => x !== l) : [...ls, l]));

  return (
    <div>
      <div role="tablist" aria-label="Lexical classification" className="scroll-row mb-4">
        {TABS.filter((t) => counts[t.key] > 0 || t.key === "all").map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={clsx("whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-semibold", tab === t.key ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink")}>
            {t.label} <span className="font-normal">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {tab !== "formation" && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search this theme</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in English or Russian" />
          </label>
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter by CEFR level">
            <span className="text-sm text-muted">CEFR:</span>
            {LEVELS.map((l) => (
              <button key={l} aria-pressed={levels.includes(l)} onClick={() => toggleLevel(l)}
                className={clsx("rounded-full border px-2.5 py-1 text-xs font-bold", levels.includes(l) ? "border-primary bg-primary-soft text-primary" : "border-line text-muted")}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {tab === "formation" ? (
        families.length === 0 ? <EmptyState title="No word families yet" body="Word-formation tables for this theme are still being written." /> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {families.map((f, i) => (
              <li key={i} className="card p-4">
                <ul className="flex flex-wrap gap-2">
                  {f.members.map((m) => <li key={m.form + m.pos} className="rounded-lg bg-surface-2 px-2.5 py-1.5 text-[15px]"><strong>{m.form}</strong> <span className="text-sm text-muted">{m.pos}</span></li>)}
                </ul>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {tab === "distinctions" && distinctions.length > 0 && (
            <section className="mb-6" aria-labelledby="h-dist">
              <h2 id="h-dist" className="mb-3 text-lg font-bold">Commonly confused words</h2>
              <ul className="space-y-3">
                {distinctions.map((d) => (
                  <li key={d.title} className="card p-4"><p className="font-display font-bold">{d.title}</p><p className="mt-1 text-[15.5px] leading-relaxed"><Rich text={d.text} /></p></li>
                ))}
              </ul>
              <h2 className="mb-3 mt-8 text-lg font-bold">Synonyms</h2>
            </section>
          )}
          {shown.length === 0 ? <EmptyState title="Nothing matches" body="Try another level or search term." /> : (
            <div className="space-y-6" data-testid="theme-entries">
              {bySubtopic.map(([sub, list]) => (
                <section key={sub} aria-label={sub}>
                  <h2 className="eyebrow mb-2">{sub} <span className="font-normal normal-case tracking-normal">({list.length})</span></h2>
                  <ul className="card divide-y divide-line">
                    {list.map((e) => (
                      <li key={e.senseId} className="flex items-start gap-3 px-4 py-3">
                        <LevelBadge level={e.level} className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <Link href={`/vocabulary/${e.slug}#${e.senseId}`} className="font-display text-[17px] font-bold hover:text-primary">{e.lemma}</Link>
                            <span className="text-sm text-muted">{e.pos}{e.register !== "neutral" ? ` · ${e.register}` : ""}{e.academic ? " · academic" : ""}</span>
                          </p>
                          <p className="text-[15px]">{e.definition}</p>
                          <p lang="ru" className="text-sm text-muted">{e.ru}</p>
                          <p className="mt-1 text-sm italic">{e.example}</p>
                          {(e.synonyms.length > 0 || e.collocations.length > 0) && (
                            <p className="mt-1 text-sm text-muted">
                              {e.collocations.length > 0 && <><span className="font-semibold">Collocations:</span> {e.collocations.join(" · ")}</>}
                              {e.synonyms.length > 0 && <>{e.collocations.length > 0 && " — "}<span className="font-semibold">Synonyms:</span> {e.synonyms.join(", ")}</>}
                            </p>
                          )}
                        </div>
                        <SaveButton compact itemType="sense" itemRef={e.senseId} label={e.lemma} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
