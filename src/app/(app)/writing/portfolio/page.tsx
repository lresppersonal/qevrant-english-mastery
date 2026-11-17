"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, FileText, PenLine, GitCompare, TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { FeedbackView, GrammarRefLink } from "@/components/FeedbackView";
import { BandTrend } from "@/components/BandTrend";
import { getWritingPrompt } from "@/lib/content";
import { WritingFeedbackView, CRITERIA_LABEL, countWords } from "@/lib/ai/schemas";
import { bandSeries, recurringIssues, wordDiff, compareVersions, developmentSummary, bandOf, isAssessed, CATEGORY_LABEL } from "@/lib/portfolio";
import type { EssayDraft, WritingSubmission } from "@/lib/store/types";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((b - a) * 2) / 2);

function Delta({ d, invert }: { d: number | null; invert?: boolean }) {
  if (d === null) return <span className="text-muted">—</span>;
  const good = invert ? d < 0 : d > 0;
  const Icon = d === 0 ? Minus : (invert ? d < 0 : d > 0) ? TrendingUp : TrendingDown;
  return <span className={clsx("inline-flex items-center gap-1 font-semibold", d === 0 ? "text-muted" : good ? "text-success" : "text-danger")}><Icon size={14} aria-hidden="true" />{d > 0 ? "+" : ""}{d}</span>;
}

function Compare({ a, b }: { a: WritingSubmission; b: WritingSubmission }) {
  const c = compareVersions(a, b);
  const diff = useMemo(() => wordDiff(a.body, b.body), [a.body, b.body]);
  return (
    <div className="mt-4 space-y-4" data-testid="version-compare">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="py-1.5 pr-3 font-medium">Measure</th><th className="pr-3 font-medium">{fmt(a.createdAt)}</th><th className="pr-3 font-medium">{fmt(b.createdAt)}</th><th className="font-medium">Change</th></tr></thead>
          <tbody className="divide-y divide-line">
            <tr><td className="py-1.5 pr-3 font-semibold">Estimated band</td><td>{c.band.before ?? "—"}</td><td>{c.band.after ?? "—"}</td><td><Delta d={delta(c.band.before, c.band.after)} /></td></tr>
            {c.criteria.map((r) => <tr key={r.criterion}><td className="py-1.5 pr-3">{CRITERIA_LABEL[r.criterion] ?? r.criterion}</td><td>{r.before ?? "—"}</td><td>{r.after ?? "—"}</td><td><Delta d={delta(r.before, r.after)} /></td></tr>)}
            <tr><td className="py-1.5 pr-3">Words</td><td>{c.words.before}</td><td>{c.words.after}</td><td className="text-muted">{c.words.before !== null && c.words.after !== null ? `${c.words.after - c.words.before > 0 ? "+" : ""}${c.words.after - c.words.before}` : "—"}</td></tr>
            {c.categories.map((r) => <tr key={r.category}><td className="py-1.5 pr-3">{CATEGORY_LABEL[r.category] ?? r.category} problems</td><td>{r.before}</td><td>{r.after}</td><td><Delta d={r.after - r.before} invert /></td></tr>)}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-semibold">What you changed in the text</p>
        <p className="mb-2 text-xs text-muted"><span className="rounded bg-[color-mix(in_srgb,var(--success)_16%,transparent)] px-1">added</span> · <span className="rounded bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] px-1 line-through">removed</span></p>
        <div className="max-h-96 overflow-auto rounded-xl bg-surface-2 p-4 text-[15px] leading-[1.8] whitespace-pre-wrap">
          {diff.map((p, i) => p.type === "same" ? <span key={i}>{p.text}</span>
            : p.type === "added" ? <ins key={i} className="rounded bg-[color-mix(in_srgb,var(--success)_16%,transparent)] no-underline">{p.text}</ins>
            : <del key={i} className="rounded bg-[color-mix(in_srgb,var(--danger)_14%,transparent)]">{p.text}</del>)}
        </div>
      </div>
    </div>
  );
}

export default function WritingPortfolio() {
  const { store, ready } = useLearner();
  const { data, error } = useLearnerData();
  const [drafts, setDrafts] = useState<EssayDraft[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [cmp, setCmp] = useState<Record<string, [string, string]>>({});
  useEffect(() => { if (ready) store.listDrafts().then(setDrafts).catch(() => {}); }, [ready, store]);

  const writing = useMemo(() => data?.writing ?? [], [data]);
  const series = useMemo(() => bandSeries(writing), [writing]);
  const recurring = useMemo(() => recurringIssues(writing), [writing]);
  const summary = useMemo(() => developmentSummary(writing), [writing]);
  const byPrompt = useMemo(() => {
    const m = new Map<string, WritingSubmission[]>();
    for (const w of [...writing].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) m.set(w.promptSlug, [...(m.get(w.promptSlug) ?? []), w]);
    return [...m.entries()].sort((a, b) => b[1][b[1].length - 1].createdAt.localeCompare(a[1][a[1].length - 1].createdAt));
  }, [writing]);
  const submitted = new Set(writing.map((w) => w.promptSlug));
  const activeDrafts = drafts.filter((d) => d.body.trim() && !writing.some((w) => w.promptSlug === d.promptSlug && w.body === d.body));

  if (error) return <p role="alert" className="text-danger">Your portfolio couldn&apos;t be loaded: {error}</p>;
  if (!data) return <div className="skeleton h-64 rounded-2xl" aria-label="Loading" />;

  const banded = series.filter((s) => s.band !== null);
  const opened = open ? writing.find((w) => w.id === open) : null;
  const openedFb = opened ? WritingFeedbackView.safeParse(opened.feedback) : null;

  return (
    <>
      <Link href="/writing" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic Writing</Link>
      <PageHeader eyebrow="Academic Writing" title="Writing portfolio"
        intro="Every essay you have written, with its feedback, versions and the mistakes that keep coming back. Bands are AI-generated educational estimates, not official IELTS scores." />

      {writing.length === 0 && activeDrafts.length === 0 ? (
        <EmptyState title="Your portfolio is empty" body="Write and submit an essay to start building your portfolio. Drafts are saved automatically while you write."
          action={<Link href="/writing" className="btn btn-primary">Choose an essay question</Link>} />
      ) : (
        <div className="space-y-8" data-testid="writing-portfolio">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard index={0} label="Essays assessed" value={series.length} hint={`${submitted.size} different questions`} />
            <StatCard index={1} label="Drafts in progress" value={activeDrafts.length} />
            <StatCard index={2} label="Latest estimated band" value={banded.length ? banded[banded.length - 1].band : "—"} hint={banded.length ? fmt(banded[banded.length - 1].date) : "No assessed essay yet"} />
            <StatCard index={3} label="Change since first essay" value={banded.length >= 2 ? <Delta d={delta(banded[0].band, banded[banded.length - 1].band)} /> : "—"} hint={banded.length >= 2 ? `over ${banded.length} essays` : "Needs two assessed essays"} />
          </div>

          {banded.length >= 2 && (
            <section className="card p-5" aria-labelledby="trend-h">
              <h2 id="trend-h" className="font-bold">Development over time</h2>
              {summary && <p className="mt-1 text-[15px] text-muted" data-testid="development-summary">{summary}</p>}
              <div className="mt-3"><BandTrend label="Estimated writing band" points={banded.map((s) => ({ date: s.date, band: s.band!, title: getWritingPrompt(s.promptSlug)?.title }))} /></div>
            </section>
          )}

          <section aria-labelledby="rec-h">
            <h2 id="rec-h" className="mb-1 text-lg font-bold">Recurring mistakes</h2>
            <p className="mb-3 text-sm text-muted">Problems the feedback found in more than one essay. “Improving” means it appeared earlier but not in your latest essay.</p>
            {recurring.length === 0 ? <p className="card p-5 text-muted">{series.length < 2 ? "Submit at least two essays to see patterns across your writing." : "No problem type has appeared in more than one essay. Well done."}</p> : (
              <ul className="grid gap-3 md:grid-cols-2" data-testid="recurring-mistakes">
                {recurring.slice(0, 8).map((r) => (
                  <li key={r.key} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                      <span className="chip">{r.pieces} essays · {r.count}×</span>
                      <span className={clsx("chip", r.trend === "improving" ? "!text-success" : r.trend === "persisting" ? "!text-danger" : "")}>{r.trend}</span>
                    </div>
                    {r.examples.slice(0, 2).map((e, i) => <p key={i} className="mt-2 text-sm"><span className="line-through decoration-danger/60">{e.quote}</span> → <span className="font-medium">{e.suggestion}</span></p>)}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      <GrammarRefLink refId={r.grammarRef} />
                      {r.grammarRef?.startsWith("lesson:") && <Link href={`/practice/smart?lesson=${r.grammarRef.slice(7).split("#")[0]}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"><Target size={14} aria-hidden="true" /> Practise this rule</Link>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {activeDrafts.length > 0 && (
            <section aria-labelledby="drafts-h">
              <h2 id="drafts-h" className="mb-3 text-lg font-bold">Drafts</h2>
              <ul className="card divide-y divide-line">
                {activeDrafts.map((d) => (
                  <li key={d.promptSlug}><Link href={`/writing/${d.promptSlug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <PenLine size={16} className="text-primary" aria-hidden="true" />
                    <span className="flex-1"><span className="block font-semibold">{getWritingPrompt(d.promptSlug)?.title ?? d.promptSlug}</span><span className="text-sm text-muted">{countWords(d.body)} words · last edited {fmt(d.updatedAt)}</span></span>
                    <span className="text-sm font-semibold text-primary">Continue</span>
                  </Link></li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="essays-h">
            <h2 id="essays-h" className="mb-3 text-lg font-bold">Essays and versions</h2>
            <ul className="space-y-3">
              {byPrompt.map(([slug, vs]) => {
                const assessed = vs.filter(isAssessed);
                const pair = cmp[slug];
                return (
                  <li key={slug} className="card p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText size={16} className="text-primary" aria-hidden="true" />
                      <Link href={`/writing/${slug}`} className="font-semibold hover:underline">{getWritingPrompt(slug)?.title ?? slug}</Link>
                      <span className="chip">{vs.length} version{vs.length === 1 ? "" : "s"}</span>
                    </div>
                    <ol className="mt-3 flex flex-wrap gap-2">
                      {vs.map((v, i) => (
                        <li key={v.id}>
                          <button onClick={() => setOpen(open === v.id ? null : v.id)} aria-expanded={open === v.id}
                            className={clsx("rounded-xl border px-3 py-2 text-left text-sm transition-colors", open === v.id ? "border-primary bg-primary-soft" : "border-line hover:border-primary")}>
                            <span className="block font-semibold">Version {i + 1}{bandOf(v) !== null ? ` · band ${bandOf(v)}` : ""}</span>
                            <span className="text-xs text-muted">{fmt(v.createdAt)} · {v.wordCount} words{!isAssessed(v) ? " · not assessed" : ""}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                    {assessed.length >= 2 && (
                      <div className="mt-3">
                        <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setCmp((c) => { const n = { ...c }; if (pair) delete n[slug]; else n[slug] = [assessed[assessed.length - 2].id, assessed[assessed.length - 1].id]; return n; })} aria-expanded={!!pair}>
                          <GitCompare size={15} aria-hidden="true" /> {pair ? "Hide comparison" : "Compare versions"}
                        </button>
                        {pair && (
                          <>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                              {[0, 1].map((k) => (
                                <label key={k} className="flex items-center gap-1.5"><span className="text-muted">{k === 0 ? "From" : "to"}</span>
                                  <select className="input !w-auto !py-1.5 text-sm" value={pair[k]} onChange={(e) => setCmp((c) => ({ ...c, [slug]: (k === 0 ? [e.target.value, pair[1]] : [pair[0], e.target.value]) as [string, string] }))}>
                                    {assessed.map((v) => <option key={v.id} value={v.id}>Version {vs.indexOf(v) + 1} · {fmt(v.createdAt)}</option>)}
                                  </select>
                                </label>
                              ))}
                            </div>
                            {pair[0] !== pair[1] && <Compare a={assessed.find((v) => v.id === pair[0])!} b={assessed.find((v) => v.id === pair[1])!} />}
                          </>
                        )}
                      </div>
                    )}
                    {opened && opened.promptSlug === slug && (
                      <div className="mt-5 border-t border-line pt-5">
                        {openedFb?.success ? <FeedbackView feedback={openedFb.data} source={opened.body} kind="writing" />
                          : <><p className="text-sm text-muted">This version hasn&apos;t been assessed yet. <Link className="font-semibold text-primary" href={`/writing/${slug}`}>Open the task</Link> to retry the assessment.</p><p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-2 p-4 text-[15px] leading-[1.8]">{opened.body}</p></>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
