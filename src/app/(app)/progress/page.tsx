"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useLearnerData } from "@/components/useLearnerData";
import { useLearner } from "@/components/StoreProvider";
import { computeStreak, daysThisWeek, mastery, studyDays, dayKey } from "@/lib/progress";
import { grammarLessons, getExercise, readingTexts } from "@/lib/content";
import { CRITERIA, SECTION_ORDER, mondayOf, sectionProgress, skillIndicators, type Indicator, weeklyActivity, weeklyReport, type AnalyticsInput, type ContentInfo, type WeeklyReport } from "@/lib/analytics";
import { LevelBadge, PageHeader, ProgressBar, StatCard } from "@/components/ui";

const smartTitle = (slug: string) => {
  if (!slug.startsWith("smart-")) return slug;
  const lesson = slug.startsWith("smart-lesson-") ? grammarLessons.find((l) => l.slug === slug.slice(13))?.title : null;
  return lesson ? `Targeted practice: ${lesson}` : { "smart-mistakes": "Mistake review", "smart-weak": "Weak areas", "smart-mixed": "Mixed review" }[slug] ?? "Adaptive practice";
};
const BAND = { not_started: "Not started", practising: "Practising", secure: "Secure", mastered: "Mastered" } as const;
const INFO: ContentInfo = {
  lessons: grammarLessons.map((l) => ({ slug: l.slug, title: l.title, sections: l.sections.map((s) => ({ id: s.id, title: s.title })) })),
  readingSlugs: readingTexts.map((r) => r.slug),
  exerciseSkill: (slug) => (slug.startsWith("smart-") ? "grammar" : getExercise(slug)?.skill),
};
const SERIES = [
  { key: "grammar", label: "Grammar answers", cls: "bg-primary" },
  { key: "reading", label: "Reading answers", cls: "bg-accent" },
  { key: "vocabulary", label: "Vocabulary reviews", cls: "bg-[color-mix(in_srgb,var(--primary)_45%,var(--surface))]" },
  { key: "listening", label: "Listening minutes", cls: "bg-[color-mix(in_srgb,var(--accent)_45%,var(--surface))]" },
] as const;

function fmtInd(v: number | null, unit: Indicator["unit"]) {
  if (v === null) return "—";
  return unit === "%" ? `${v}%` : unit === "per100" ? `${v} / 100 w` : unit === "days" ? `${v} d` : `${v}`;
}
function IndicatorRow({ i }: { i: Indicator }) {
  const d = i.current !== null && i.previous !== null ? Math.round((i.current - i.previous) * 10) / 10 : null;
  const good = d !== null && d !== 0 && (i.lowerIsBetter ? d < 0 : d > 0);
  return (
    <tr className="border-t border-line">
      <th scope="row" className="px-4 py-2.5 text-left font-medium">{i.label}<span className="block text-xs font-normal text-muted">{i.rule}</span></th>
      <td className="px-4 py-2.5 font-semibold tabular-nums">{fmtInd(i.current, i.unit)}</td>
      <td className="px-4 py-2.5 tabular-nums text-muted">{fmtInd(i.previous, i.unit)}</td>
      <td className={clsx("px-4 py-2.5 text-sm font-semibold tabular-nums", d === null || d === 0 ? "text-muted" : good ? "text-success" : "text-danger")}>
        {d === null ? "—" : d === 0 ? "same" : `${d > 0 ? "▲" : "▼"} ${Math.abs(d)}${i.unit === "%" ? " pts" : ""}`}
      </td>
      <td className="hidden px-4 py-2.5 text-xs text-muted md:table-cell">{i.evidence}</td>
    </tr>
  );
}

function ScoreRing({ value }: { value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${v * 3.6}deg, var(--surface-2) 0)` }} aria-hidden="true">
      <div className="grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full bg-surface"><span className="font-display text-3xl font-extrabold">{value === null ? "—" : value}</span></div>
    </div>
  );
}

function ReportView({ r, previous }: { r: WeeklyReport; previous?: number | null }) {
  const delta = r.overall !== null && previous !== undefined && previous !== null ? r.overall - previous : null;
  return (
    <div data-testid="weekly-report">
      <div className="flex flex-wrap items-center gap-5">
        <ScoreRing value={r.overall} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Week of {new Date(r.weekStart).toLocaleDateString(undefined, { day: "numeric", month: "long" })} – {new Date(r.weekEnd).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="mt-1 text-2xl font-extrabold">{r.overall === null ? "No activity recorded yet" : `Overall: ${r.overall} / 100`}</p>
          {delta !== null && <p className={clsx("text-sm font-semibold", delta >= 0 ? "text-success" : "text-danger")}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} points vs the week before</p>}
          <p className="mt-1 text-sm text-muted">{r.totals.studyDays} study days · {r.totals.activities} activities · {r.totals.answers} answers · {r.totals.minutesListened} min listening</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-surface-2"><tr><th scope="col" className="px-4 py-2">Section</th><th scope="col" className="px-4 py-2">Score</th><th scope="col" className="hidden px-4 py-2 sm:table-cell">Evidence</th></tr></thead>
          <tbody>
            {SECTION_ORDER.map((k) => {
              const s = r.sections.find((x) => x.key === k)!;
              return (
                <tr key={k} className="border-t border-line">
                  <td className="px-4 py-2.5 font-medium">{CRITERIA[k].label}</td>
                  <td className="px-4 py-2.5">{s.score === null ? <span className="text-sm text-muted">Insufficiently assessed</span> : <div className="flex items-center gap-2"><span className="w-10 font-semibold tabular-nums">{s.score}%</span><div className="w-24"><ProgressBar value={s.score / 100} label={`${CRITERIA[k].label} score`} /></div></div>}</td>
                  <td className="hidden px-4 py-2.5 text-sm text-muted sm:table-cell">{s.evidence}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-primary">How these scores are calculated</summary>
        <ul className="mt-2 space-y-1.5 text-muted">
          {SECTION_ORDER.map((k) => <li key={k}><strong className="text-ink">{CRITERIA[k].label}:</strong> {CRITERIA[k].rule} <em>Needs: {CRITERIA[k].minEvidence}</em></li>)}
          <li><strong className="text-ink">Overall:</strong> the average of all assessed sections. Sections marked “insufficiently assessed” are left out rather than counted as zero. Speaking and writing use AI estimates, which are educational, not official exam scores.</li>
        </ul>
      </details>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-surface-2 p-4"><p className="font-bold text-success">Strongest</p><p className="mt-1">{r.strongest.length ? r.strongest.map((k) => CRITERIA[k].label).join(", ") : "Not enough evidence yet"}</p></div>
        <div className="rounded-xl bg-surface-2 p-4"><p className="font-bold text-accent-text">Needs most work</p><p className="mt-1">{r.weakest.length ? r.weakest.map((k) => CRITERIA[k].label).join(", ") : "Not enough evidence yet"}</p></div>
      </div>
      {r.recurringMistakes.length > 0 && (
        <div className="mt-5">
          <p className="font-bold">Recurring mistakes</p>
          <ul className="mt-2 space-y-1">{r.recurringMistakes.map((m) => <li key={m.label} className="flex justify-between gap-3">{m.href ? <Link href={m.href} className="text-primary underline-offset-4 hover:underline">{m.label}</Link> : <span>{m.label}</span>}<span className="text-sm text-muted">{m.count}×</span></li>)}</ul>
        </div>
      )}
      {r.recommendations.length > 0 && <div className="mt-5"><p className="font-bold">Recommendations</p><ul className="mt-2 list-disc space-y-1.5 pl-5">{r.recommendations.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      {r.priorities.length > 0 && <div className="mt-5 rounded-xl border border-primary/40 bg-primary-soft p-4"><p className="font-bold">Priorities for next week</p><ol className="mt-2 list-decimal space-y-1 pl-5">{r.priorities.map((x) => <li key={x}>{x}</li>)}</ol></div>}
    </div>
  );
}

export default function ProgressPage() {
  const { data } = useLearnerData();
  const { profile, saved, store } = useLearner();
  const [week, setWeek] = useState<"current" | "previous" | string>("current");
  const savedOnce = useRef(false);

  const input: AnalyticsInput | null = useMemo(() => data && profile ? {
    events: data.events, responses: data.responses, attempts: data.attempts, reviewLogs: data.reviewLogs, saved,
    writing: data.writing, speaking: data.speaking, listening: data.listening, weeklyGoalDays: profile.weeklyGoalDays,
  } : null, [data, profile, saved]);

  const current = useMemo(() => input && weeklyReport(input, INFO, new Date()), [input]);
  const indicators = useMemo(() => input && skillIndicators(input, INFO), [input]);
  const previous = useMemo(() => { if (!input) return null; const d = mondayOf(new Date()); d.setDate(d.getDate() - 7); return weeklyReport(input, INFO, d); }, [input]);
  const [history, setHistory] = useState<{ weekStart: string; overall: number | null; report: WeeklyReport }[]>([]);

  // Save this week's report (and last week's, if it had activity) so history can be compared later.
  useEffect(() => {
    if (!data || !current || !previous || savedOnce.current) return;
    savedOnce.current = true;
    const jobs = [store.saveWeeklyReport({ weekStart: current.weekStart, overall: current.overall, report: current })];
    if (previous.overall !== null) jobs.push(store.saveWeeklyReport({ weekStart: previous.weekStart, overall: previous.overall, report: previous }));
    Promise.all(jobs).then(() => store.listWeeklyReports()).then((rows) => setHistory(rows.map((r) => ({ weekStart: r.weekStart, overall: r.overall, report: r.report as WeeklyReport })))).catch(() => {
      setHistory(data.reports.map((r) => ({ weekStart: r.weekStart, overall: r.overall, report: r.report as WeeklyReport })));
    });
  }, [data, current, previous, store]);

  if (!data || !profile || !input || !current || !previous) return <div aria-busy="true" className="h-40 animate-pulse rounded-2xl bg-surface-2" />;

  const sp = sectionProgress(input, INFO);
  const activity = weeklyActivity(input, INFO, 8);
  const maxAct = Math.max(1, ...activity.map((a) => SERIES.reduce((n, s) => n + a[s.key], 0)));
  const shown = week === "current" ? current : week === "previous" ? previous : history.find((h) => h.weekStart === week)?.report ?? current;
  const prevOverall = (() => {
    const all = [...history.map((h) => ({ w: h.weekStart, o: h.overall })), { w: previous.weekStart, o: previous.overall }].sort((a, b) => a.w.localeCompare(b.w));
    const before = all.filter((x) => x.w < shown.weekStart);
    return before.length ? before[before.length - 1].o : undefined;
  })();
  const trend = [...new Map([...history.map((h) => [h.weekStart, h.overall] as const), [previous.weekStart, previous.overall] as const, [current.weekStart, current.overall] as const]).entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-10);

  const days = studyDays(data.events);
  const weeks = 12;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const grid = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => { const x = new Date(start); x.setDate(start.getDate() + w * 7 + d); return x; }));
  const answered = data.responses.length;
  const correct = data.responses.filter((r) => r.correct).length;

  return (
    <>
      <PageHeader eyebrow="Me" title="Progress" intro="Every number here is calculated from your own answers and activity. Rules are shown next to each score, and nothing is rounded up." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall progress" value={`${Math.round(sp.overall * 100)}%`} hint="Average of the seven section bars below" />
        <StatCard label="Study streak" value={`${computeStreak(data.events)} d`} hint={`This week: ${daysThisWeek(data.events)} / ${profile.weeklyGoalDays} days`} />
        <StatCard label="Exercises completed" value={sp.exercisesCompleted} hint={answered ? `${Math.round((correct / answered) * 100)}% of ${answered} answers correct` : "No answers yet"} />
        <StatCard label="Skills practice" value={`${data.writing.length + data.speaking.length + data.listening.length}`} hint={`${data.writing.length} essays · ${data.speaking.length} speaking · ${data.listening.length} listening`} />
      </div>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="h-sections">
        <h2 id="h-sections" className="text-lg font-bold">Progress by section</h2>
        <ul className="mt-4 space-y-4">
          {sp.rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2"><span className="font-semibold">{r.label}</span><span className="text-sm text-muted">{r.detail}</span></div>
              <ProgressBar value={r.value} label={`${r.label} progress`} />
            </li>
          ))}
        </ul>
      </section>

      {indicators && (
        <section className="card mt-6 p-5 sm:p-6" aria-labelledby="h-ind" data-testid="skill-indicators">
          <h2 id="h-ind" className="text-lg font-bold">Skill indicators</h2>
          <p className="mt-1 text-sm text-muted">The last 30 days compared with the 30 days before. “—” means there isn&apos;t enough evidence yet, not a score of zero.</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-[15px]">
              <thead className="bg-surface-2 text-left text-sm"><tr><th scope="col" className="px-4 py-2">Indicator</th><th scope="col" className="whitespace-nowrap px-4 py-2">Last 30 days</th><th scope="col" className="px-4 py-2">Before</th><th scope="col" className="whitespace-nowrap px-4 py-2">Change</th><th scope="col" className="hidden px-4 py-2 md:table-cell">Evidence</th></tr></thead>
              <tbody>{indicators.map((i) => <IndicatorRow key={i.key} i={i} />)}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="h-report">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="h-report" className="flex-1 text-lg font-bold">Weekly report</h2>
          <label htmlFor="wk" className="sr-only">Choose a week</label>
          <select id="wk" className="input !w-auto !py-1.5 text-sm" value={week} onChange={(e) => setWeek(e.target.value)}>
            <option value="current">This week (so far)</option>
            <option value="previous">Last week</option>
            {history.filter((h) => h.weekStart < previous.weekStart).map((h) => <option key={h.weekStart} value={h.weekStart}>Week of {h.weekStart}{h.overall !== null ? ` — ${h.overall}` : ""}</option>)}
          </select>
        </div>
        <ReportView r={shown} previous={prevOverall} />
      </section>

      <section className="card mt-6 p-5 sm:p-6" aria-labelledby="h-trends">
        <h2 id="h-trends" className="text-lg font-bold">Trends</h2>
        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <figure>
            <figcaption className="mb-2 text-sm font-semibold">Weekly overall score</figcaption>
            <div className="flex h-40 items-end gap-2 border-b border-line" role="img" aria-label={`Weekly overall scores: ${trend.map(([w, o]) => `${w}: ${o ?? "no data"}`).join("; ")}`}>
              {trend.map(([w, o]) => (
                <div key={w} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-semibold tabular-nums">{o ?? "—"}</span>
                  <div className="w-full max-w-10 rounded-t-md bg-primary" style={{ height: `${Math.max(2, (o ?? 0) * 1.2)}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">{trend.map(([w]) => <span key={w} className="flex-1 text-center text-[11px] text-muted">{w.slice(5)}</span>)}</div>
          </figure>
          <figure>
            <figcaption className="mb-2 text-sm font-semibold">Practice volume, last 8 weeks</figcaption>
            <div className="flex h-40 items-end gap-2 border-b border-line" role="img" aria-label="Stacked bars of grammar answers, reading answers, vocabulary reviews and listening minutes per week">
              {activity.map((a) => (
                <div key={a.week} className="flex h-full flex-1 flex-col justify-end">
                  {SERIES.map((s) => a[s.key] > 0 && <div key={s.key} className={clsx("w-full max-w-10 self-center first:rounded-t-md", s.cls)} style={{ height: `${(a[s.key] / maxAct) * 100}%` }} title={`${s.label}: ${a[s.key]}`} />)}
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2">{activity.map((a) => <span key={a.week} className="flex-1 text-center text-[11px] text-muted">{a.week.slice(5)}</span>)}</div>
            <ul className="mt-3 flex flex-wrap gap-3 text-xs">{SERIES.map((s) => <li key={s.key} className="flex items-center gap-1.5"><span className={clsx("h-3 w-3 rounded-sm", s.cls)} aria-hidden="true" />{s.label}</li>)}</ul>
            <table className="sr-only"><caption>Practice volume per week</caption><thead><tr><th>Week</th>{SERIES.map((s) => <th key={s.key}>{s.label}</th>)}<th>Speaking</th><th>Writing</th></tr></thead>
              <tbody>{activity.map((a) => <tr key={a.week}><td>{a.week}</td>{SERIES.map((s) => <td key={s.key}>{a[s.key]}</td>)}<td>{a.speaking}</td><td>{a.writing}</td></tr>)}</tbody></table>
          </figure>
        </div>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="h-activity">
        <h2 id="h-activity" className="text-lg font-bold">Study days, last {weeks} weeks</h2>
        <div className="mt-4 flex gap-1 overflow-x-auto" role="img" aria-label={`${days.size} study days recorded`}>
          {grid.map((wk, w) => (
            <div key={w} className="flex flex-col gap-1">
              {wk.map((d) => {
                const on = days.has(dayKey(d));
                const future = d > today;
                return <span key={d.toISOString()} title={d.toDateString()} className={`h-4 w-4 rounded-[4px] ${future ? "bg-transparent" : on ? "bg-primary" : "bg-surface-2"}`} />;
              })}
            </div>
          ))}
        </div>
      </section>

      <details className="card mt-6 p-5">
        <summary className="cursor-pointer text-lg font-bold">Grammar mastery by topic</summary>
        <p className="mt-1 text-sm text-muted">Based on your last 10 answers per lesson. “Secure” needs at least 4 answers at 80%+; “Mastered” needs 8 at 90%+.</p>
        <ul className="mt-4 space-y-4">
          {grammarLessons.map((l) => {
            const m = mastery(data.responses, l.slug);
            return (
              <li key={l.slug}>
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <LevelBadge level={l.level} />
                  <Link href={`/grammar/${l.slug}`} className="flex-1 font-medium hover:text-primary">{l.title}</Link>
                  <span className="text-sm text-muted">{BAND[m.band]}{m.answered ? ` · ${Math.round(m.accuracy * 100)}% of ${m.answered}` : ""}</span>
                </div>
                <ProgressBar value={m.answered ? m.accuracy : 0} label={`${l.title} accuracy`} />
              </li>
            );
          })}
        </ul>
      </details>

      <details className="card mt-6 p-5">
        <summary className="cursor-pointer text-lg font-bold">Exercise history</summary>
        {data.attempts.length === 0 ? <p className="mt-2 text-sm text-muted">Completed exercises will appear here.</p> : (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="py-2 font-semibold">Exercise</th><th className="py-2 font-semibold">Score</th><th className="py-2 font-semibold">Date</th></tr></thead>
            <tbody>
              {[...data.attempts].reverse().slice(0, 30).map((a) => (
                <tr key={a.id} className="border-t border-line"><td className="py-2">{getExercise(a.exerciseSlug)?.title ?? smartTitle(a.exerciseSlug)}</td><td className="py-2">{a.score} / {a.total}</td><td className="py-2">{new Date(a.completedAt).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </details>
    </>
  );
}
