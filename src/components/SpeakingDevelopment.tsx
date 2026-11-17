"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { BandTrend } from "./BandTrend";
import { GrammarRefLink } from "./FeedbackView";
import { getSpeakingPrompt } from "@/lib/content";
import { bankPrompt } from "@/lib/speaking-bank";
import { bandSeries, recurringIssues, compareVersions, developmentSummary, isAssessed, CATEGORY_LABEL } from "@/lib/portfolio";
import { CRITERIA_LABEL } from "@/lib/ai/schemas";
import type { SpeakingAttempt } from "@/lib/store/types";

const title = (slug: string) => (slug.startsWith("bank:") ? bankPrompt(slug.slice(5))?.prompt : getSpeakingPrompt(slug)?.title) ?? slug;
const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function Change({ before, after, lowerIsBetter, unit = "" }: { before?: number | null; after?: number | null; lowerIsBetter?: boolean; unit?: string }) {
  if (before == null || after == null) return <span className="text-muted">—</span>;
  const d = Math.round((after - before) * 10) / 10;
  const good = lowerIsBetter ? d < 0 : d > 0;
  const Icon = d === 0 ? Minus : d > 0 ? TrendingUp : TrendingDown;
  return <span className={clsx("inline-flex items-center gap-1 font-semibold", d === 0 ? "text-muted" : good ? "text-success" : "text-danger")}><Icon size={14} aria-hidden="true" />{before}{unit} → {after}{unit}</span>;
}

/** Speaking development over time: band trend, delivery measures, recurring problems, and first-vs-latest comparison for repeated questions. */
export function SpeakingDevelopment() {
  const { store, ready } = useLearner();
  const [all, setAll] = useState<SpeakingAttempt[] | null>(null);
  useEffect(() => { if (ready) store.listSpeaking().then(setAll).catch(() => setAll([])); }, [ready, store]);

  const subs = useMemo(() => (all ?? []).map((a) => ({ ...a, wordCount: a.metrics?.words })), [all]);
  const series = useMemo(() => bandSeries(subs).filter((s) => s.band !== null), [subs]);
  const recurring = useMemo(() => recurringIssues(subs), [subs]);
  const summary = useMemo(() => developmentSummary(subs), [subs]);
  const repeated = useMemo(() => {
    const m = new Map<string, SpeakingAttempt[]>();
    for (const a of [...(all ?? [])].filter((x) => isAssessed(x)).sort((x, y) => x.createdAt.localeCompare(y.createdAt))) m.set(a.promptSlug, [...(m.get(a.promptSlug) ?? []), a]);
    return [...m.entries()].filter(([, v]) => v.length >= 2);
  }, [all]);

  if (!all || all.length === 0) return null;
  const done = all.filter((a) => isAssessed(a)).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const first = done[0], last = done[done.length - 1];

  return (
    <section className="mb-10" aria-labelledby="sp-dev-h" data-testid="speaking-development">
      <h2 id="sp-dev-h" className="mb-1 text-xl font-bold">Your speaking development</h2>
      <p className="mb-4 text-sm text-muted">{done.length} assessed answer{done.length === 1 ? "" : "s"}. Bands are AI-generated educational estimates from transcripts, not official IELTS scores.</p>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <p className="font-semibold">Estimated band over time</p>
          {summary && <p className="mt-1 text-sm text-muted">{summary}</p>}
          {series.length >= 2 ? <div className="mt-3"><BandTrend label="Estimated speaking band" points={series.map((s) => ({ date: s.date, band: s.band! }))} /></div>
            : <p className="mt-2 text-sm text-muted">Record and assess one more answer to see your trend.</p>}
        </div>
        <div className="card p-5">
          <p className="font-semibold">Delivery: first vs latest</p>
          {first && last && first.id !== last.id ? (
            <dl className="mt-2 grid gap-1.5 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted">Words per minute</dt><dd><Change before={first.metrics?.wordsPerMinute} after={last.metrics?.wordsPerMinute} /></dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Fillers heard</dt><dd><Change before={first.metrics?.fillers} after={last.metrics?.fillers} lowerIsBetter /></dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Words per sentence</dt><dd><Change before={first.metrics?.avgSentenceWords} after={last.metrics?.avgSentenceWords} /></dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">Length (words)</dt><dd><Change before={first.metrics?.words} after={last.metrics?.words} /></dd></div>
            </dl>
          ) : <p className="mt-2 text-sm text-muted">Comparisons appear after your second assessed answer.</p>}
          <p className="mt-3 text-xs text-muted">A faster pace is not always better: aim for steady delivery (roughly 110–160 words a minute) with few fillers.</p>
        </div>
      </div>

      {recurring.length > 0 && done.length >= 2 && (
        <div className="mt-4 card p-5">
          <p className="font-semibold">Problems that keep coming back</p>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {recurring.slice(0, 6).map((r) => (
              <li key={r.key} className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-sm">
                <span className="font-semibold">{CATEGORY_LABEL[r.category] ?? r.category}</span> <span className="text-muted">· {r.pieces} answers · {r.trend}</span>
                {r.examples[0] && <p className="mt-1"><span className="line-through decoration-danger/60">{r.examples[0].quote}</span> → {r.examples[0].suggestion}</p>}
                <div className="mt-1 flex flex-wrap gap-x-4"><GrammarRefLink refId={r.grammarRef} />
                  {r.grammarRef?.startsWith("lesson:") && <Link href={`/practice/smart?lesson=${r.grammarRef.slice(7).split("#")[0]}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><Target size={14} aria-hidden="true" /> Practise this rule</Link>}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {repeated.length > 0 && (
        <div className="mt-4 card p-5">
          <p className="font-semibold">Same question, answered again</p>
          <p className="text-sm text-muted">How your latest answer compares with your first attempt at the same question.</p>
          <ul className="mt-3 space-y-3">
            {repeated.slice(0, 5).map(([slug, v]) => {
              const c = compareVersions({ ...v[0], wordCount: v[0].metrics?.words }, { ...v[v.length - 1], wordCount: v[v.length - 1].metrics?.words });
              const fixed = c.categories.filter((x) => x.after < x.before);
              return (
                <li key={slug} className="rounded-xl border border-line p-3.5 text-sm">
                  <p className="font-medium">{title(slug)}</p>
                  <p className="mt-1 text-muted">{v.length} attempts · {fmt(v[0].createdAt)} → {fmt(v[v.length - 1].createdAt)} · band <Change before={c.band.before} after={c.band.after} /></p>
                  {c.criteria.some((x) => x.before !== x.after) && <p className="mt-1">{c.criteria.filter((x) => x.before !== null && x.after !== null && x.before !== x.after).map((x) => `${CRITERIA_LABEL[x.criterion] ?? x.criterion} ${x.before} → ${x.after}`).join(" · ")}</p>}
                  {fixed.length > 0 && <p className="mt-1 text-success">Fewer problems with {fixed.map((x) => (CATEGORY_LABEL[x.category] ?? x.category).toLowerCase()).join(", ")}.</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
