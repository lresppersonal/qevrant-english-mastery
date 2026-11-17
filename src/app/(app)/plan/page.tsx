"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Headphones, Library, Mic, PenLine, Repeat, SkipForward, Target, CalendarDays, TrendingDown } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { PageHeader, LevelBadge, ProgressBar } from "@/components/ui";
import { PROGRAMME, WEEK_TITLES } from "@/lib/plan/programme";
import { planProgress, planInsights, readPlan, type Block, type BlockKey, type DayView, type PlanSettings } from "@/lib/plan/engine";
import { getTheme } from "@/lib/content";

const ICON: Record<BlockKey, typeof BookOpen> = { grammar: BookOpen, vocabulary: Library, reading: BookOpen, listening: Headphones, writing: PenLine, speaking: Mic, revision: Repeat };

const PRINCIPLES = [
  ["One theme, seven activities", "Each day links a grammar topic to a vocabulary theme and uses both in reading, listening, writing and speaking, so new language is met in context and then used."],
  ["Retrieval before review", "Practice sets, weekly checks and speaking without notes ask you to recall rather than reread. Retrieval practice is one of the better-supported study techniques in learning research."],
  ["Spacing", "Saved words return in spaced reviews, and earlier grammar and texts come back after one or more weeks instead of being studied once."],
  ["Interleaving", "Consolidation days and weekly checks mix several topics in one set, which is harder in the moment but helps you choose the right structure later."],
  ["Deliberate practice with feedback", "Writing and speaking are assessed against explicit criteria, and the next days' revision targets the topics where your accuracy is lowest."],
  ["Progressive difficulty", "Week 1 starts at B2; weeks 5–6 work at C1–C2. Learners who already have a secure B2 can start at week 3."],
] as const;

function BlockRow({ b, active }: { b: Block; active: boolean }) {
  const Icon = ICON[b.key];
  return (
    <li className={clsx("flex items-start gap-3 py-3", !b.required && "opacity-80")}>
      <span className={clsx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", b.doneAt ? "bg-success text-white" : "bg-surface-2 text-muted")}>
        {b.doneAt ? <CheckCircle2 size={16} aria-label="Done" /> : <Icon size={16} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{b.label}</span><span className="text-muted">· {b.minutes} min</span>{!b.required && <span className="chip !text-[11px]">extension</span>}{b.result && <span className="chip !text-[11px]">{b.result}</span>}</p>
        <p className="font-medium">{b.title}</p>
        <p className="text-sm text-muted">{b.why}</p>
      </div>
      {active && <Link href={b.href} className={clsx("btn shrink-0 !min-h-9 !px-3 text-sm", b.doneAt ? "btn-ghost" : "btn-primary")}>{b.doneAt ? "Open" : "Start"} <ArrowRight size={14} aria-hidden="true" /></Link>}
    </li>
  );
}

function DayCard({ v, onSkip }: { v: DayView; onSkip?: () => void }) {
  const done = v.blocks.filter((b) => b.required && b.doneAt).length, req = v.blocks.filter((b) => b.required).length;
  return (
    <section className="card overflow-hidden" data-testid="plan-today" aria-labelledby="h-day">
      <div className="border-b border-line bg-gradient-to-r from-primary-soft to-surface px-5 py-4 sm:px-6">
        <p className="eyebrow">Week {v.day.week} · Day {v.day.n}{v.day.kind === "review" ? " · Review and assessment" : ""}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2"><h2 id="h-day" className="flex-1 text-2xl font-extrabold">{v.day.title}</h2><LevelBadge level={v.day.level} /></div>
        <p className="mt-1 text-[15px]"><span className="font-semibold">Objective: </span>{v.day.objective}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5"><Clock size={15} aria-hidden="true" /> about {v.minutes} min</span>
          <span>Theme: {getTheme(v.day.theme)?.title ?? v.day.theme}</span>
          <span className="flex-1"><ProgressBar value={done / req} label="Day progress" /></span>
          <span className="tabular-nums" data-testid="plan-day-progress">{done} / {req} done</span>
        </div>
      </div>
      <ol className="divide-y divide-line px-5 sm:px-6">{v.blocks.map((b) => <BlockRow key={b.key} b={b} active />)}</ol>
      {onSkip && <div className="border-t border-line px-5 py-3 text-right sm:px-6"><button type="button" onClick={onSkip} className="btn btn-ghost !min-h-9 !px-3 text-sm"><SkipForward size={14} aria-hidden="true" /> Skip this day</button></div>}
    </section>
  );
}

export default function PlanPage() {
  const { profile, store, refresh, saved, toast } = useLearner();
  const { data, error } = useLearnerData();
  const settings = readPlan(profile);
  const [startWeek, setStartWeek] = useState<1 | 3>(1);
  const [intensity, setIntensity] = useState<"full" | "focused">("focused");
  const pd = useMemo(() => (data ? { ...data, saved } : null), [data, saved]);
  const prog = useMemo(() => (settings && pd ? planProgress(settings, pd) : null), [settings, pd]);
  const insights = useMemo(() => (settings && pd && prog ? planInsights(settings, pd, prog.days) : null), [settings, pd, prog]);

  async function save(next: PlanSettings | null) {
    await store.updateProfile({ preferences: { ...(profile?.preferences ?? {}), intensive: next } });
    await refresh();
  }
  async function start() { await save({ startedAt: new Date().toISOString(), intensity, startWeek, skipped: {} }); toast("Intensive Study Plan started"); }
  async function skip(n: number) {
    if (!settings || !window.confirm("Skip this day? It will be marked as skipped, not completed, and the next day will start.")) return;
    await save({ ...settings, skipped: { ...settings.skipped, [String(n)]: new Date().toISOString() } });
  }
  async function leave() { if (window.confirm("Leave the plan? Your activity stays in your progress; only the plan schedule is removed.")) { await save(null); toast("You have left the plan"); } }

  if (error) return <p role="alert" className="text-danger">Your progress couldn&apos;t be loaded: {error}</p>;
  if (!data || !profile) return <div className="skeleton h-96 rounded-2xl" aria-label="Loading" />;

  return (
    <>
      <PageHeader eyebrow="Learn" title="Intensive Study Plan"
        intro="A six-week programme for learners with an upper-intermediate or advanced foundation. Each day centres on one objective and connects grammar, vocabulary, reading, listening, writing, speaking and revision, so the activities reinforce one another." />

      {!settings ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" data-testid="plan-intro">
          <section className="card p-5 sm:p-6" aria-labelledby="h-method">
            <h2 id="h-method" className="text-lg font-bold">The QEVRANT method</h2>
            <ul className="mt-3 space-y-3">{PRINCIPLES.map(([t, d]) => <li key={t}><p className="font-semibold">{t}</p><p className="text-[15px] text-muted">{d}</p></li>)}</ul>
            <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">The plan combines learning principles that are widely discussed in educational research; it has not itself been tested in a controlled study, and results depend on regular, active use.</p>
          </section>
          <section className="card p-5 sm:p-6" aria-labelledby="h-start">
            <h2 id="h-start" className="text-lg font-bold">Start the plan</h2>
            <p className="mt-1 text-sm text-muted">42 days: six themed study days and one review-and-assessment day each week. Self-paced: a new day opens when you finish the previous one.</p>
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Where to start</legend>
              <div className="mt-2 grid gap-2">
                {([[1, "Week 1 (B2)", "Tense, aspect and precision first"], [3, "Week 3 (B2+/C1)", "If your B2 grammar is already secure"]] as const).map(([v, l, h]) => (
                  <label key={v} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", startWeek === v ? "border-primary bg-primary-soft" : "border-line")}><input type="radio" name="sw" className="mt-1" checked={startWeek === v} onChange={() => setStartWeek(v)} /><span><span className="block font-semibold">{l}</span><span className="text-sm text-muted">{h}</span></span></label>
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Intensity</legend>
              <div className="mt-2 grid gap-2">
                {([["focused", "Focused (about 1 hour 40 minutes a day on average)", "Writing and listening on alternate days; the other is an optional extension. Review days are shorter."], ["full", "Full (about 2 hours a day on average, up to 2½)", "All seven activities every study day, for learners with more time"]] as const).map(([v, l, h]) => (
                  <label key={v} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", intensity === v ? "border-primary bg-primary-soft" : "border-line")}><input type="radio" name="int" className="mt-1" checked={intensity === v} onChange={() => setIntensity(v)} /><span><span className="block font-semibold">{l}</span><span className="text-sm text-muted">{h}</span></span></label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-primary mt-5 w-full" onClick={start}>Start the Intensive Study Plan</button>
          </section>
          <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="h-weeks">
            <h2 id="h-weeks" className="text-lg font-bold">The six weeks</h2>
            <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WEEK_TITLES.map((t, i) => (
                <li key={t} className="rounded-xl border border-line p-3"><p className="eyebrow">Week {i + 1}</p><p className="font-semibold">{t}</p>
                  <p className="mt-1 text-sm text-muted">{PROGRAMME.filter((d) => d.week === i + 1 && d.kind === "study").map((d) => d.title).join(" · ")}</p></li>
              ))}
            </ol>
          </section>
        </div>
      ) : prog && (
        <div className="space-y-6" data-testid="plan-active">
          <div className="card flex flex-wrap items-center gap-4 p-5">
            <CalendarDays size={22} className="text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{prog.doneCount} of {prog.days.length} days completed{Object.keys(settings.skipped).length ? ` · ${Object.keys(settings.skipped).length} skipped` : ""}</p>
              <div className="mt-1.5"><ProgressBar value={prog.doneCount / prog.days.length} label="Plan progress" /></div>
            </div>
            <span className="chip">{settings.intensity === "full" ? "Full intensity" : "Focused intensity"}</span>
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" onClick={leave}>Leave plan</button>
          </div>

          {prog.current ? <DayCard v={prog.current} onSkip={() => skip(prog.current!.day.n)} />
            : <div className="card p-6"><p className="text-lg font-bold">Plan complete — well done.</p><p className="mt-1 text-muted">Keep your progress with spaced review and the adaptive practice sets.</p></div>}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5" aria-labelledby="h-weak">
              <h2 id="h-weak" className="flex items-center gap-2 text-lg font-bold"><TrendingDown size={18} aria-hidden="true" /> Recurring weaknesses</h2>
              {insights?.weak.length ? (
                <ul className="mt-2 space-y-2">{insights.weak.slice(0, 4).map((w) => <li key={w.slug} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"><span><span className="font-medium">{w.title}</span><span className="block text-sm text-muted">{Math.round(w.m.accuracy * 100)}% of your last {w.m.answered} answers</span></span><Link href={`/practice/smart?lesson=${w.slug}`} className="btn btn-ghost !min-h-9 !px-3 text-sm"><Target size={14} aria-hidden="true" /> Practise</Link></li>)}</ul>
              ) : <p className="mt-2 text-sm text-muted">None so far. Topics where your accuracy falls below 70% appear here and return in the revision block.</p>}
            </section>
            <section className="card p-5" aria-labelledby="h-assess">
              <h2 id="h-assess" className="text-lg font-bold">Weekly assessments</h2>
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">{insights?.assessments.map((a) => <li key={a.week} className="rounded-lg bg-surface-2 px-2 py-2 text-center"><p className="text-xs text-muted">Week {a.week}</p><p className="font-display text-lg font-bold">{a.result ?? "—"}</p></li>)}</ul>
            </section>
          </div>

          <section aria-labelledby="h-all">
            <h2 id="h-all" className="mb-3 text-lg font-bold">All days</h2>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {prog.days.map((v) => (
                <li key={v.day.n} className={clsx("rounded-xl border px-3 py-2.5", v.status === "current" ? "border-primary bg-primary-soft" : "border-line")}>
                  <p className="flex items-center gap-2 text-sm">{v.status === "done" ? <CheckCircle2 size={15} className="text-success" aria-label="Done" /> : v.status === "skipped" ? <SkipForward size={15} className="text-muted" aria-label="Skipped" /> : <Circle size={15} className="text-muted" aria-hidden="true" />}<span className="text-muted">Day {v.day.n}</span>{v.day.kind === "review" && <span className="chip !text-[11px]">review</span>}</p>
                  <p className="font-medium">{v.day.title}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
