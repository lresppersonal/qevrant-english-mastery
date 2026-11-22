"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Clock, Headphones, Library, Mic, PenLine, Repeat, SkipForward, Target, CalendarDays, TrendingDown, SlidersHorizontal, ChevronDown, UserRound } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { PageHeader, LevelBadge, ProgressBar } from "@/components/ui";
import { PROGRAMME, WEEK_TITLES } from "@/lib/plan/programme";
import { planProgress, planInsights, readPlan, START_WEEK, type Block, type BlockKey, type DayView, type PlanSettings } from "@/lib/plan/engine";
import { getTheme, getLesson, getReading, getWritingPrompt } from "@/lib/content";
import type { PlanDay } from "@/lib/plan/programme";
import { computePriorities, readAssessment, readOverrides, SKILL_LABEL, PRIORITY_LABEL, type Priority, type Skill, type SkillPriority } from "@/lib/plan/personal";
import { LearningProfileForm } from "@/components/LearningProfileForm";

const ICON: Record<BlockKey, typeof BookOpen> = { grammar: BookOpen, vocabulary: Library, reading: BookOpen, listening: Headphones, writing: PenLine, speaking: Mic, revision: Repeat, focus: Target };
const PRIORITY_CHIP: Record<Priority, string> = { high: "!border-primary !bg-primary-soft !text-primary", medium: "", maintenance: "!text-muted" };

const PRINCIPLES = [
  ["One theme, seven activities", "Each day links a grammar topic to a vocabulary theme and uses both in reading, listening, writing and speaking, so new language is met in context and then used."],
  ["Retrieval before review", "Practice sets, weekly checks and speaking without notes ask you to recall rather than reread. Retrieval practice is one of the better-supported study techniques in learning research."],
  ["Spacing", "Saved words return in spaced reviews, and earlier grammar and texts come back after one or more weeks instead of being studied once."],
  ["Interleaving", "Consolidation days and weekly checks mix several topics in one set, which is harder in the moment but helps you choose the right structure later."],
  ["Deliberate practice with feedback", "Writing and speaking are assessed against explicit criteria, and the next days' revision targets the topics where your accuracy is lowest."],
  ["Progressive difficulty", "Week 1 starts at B2; weeks 5–6 work at C1–C2. Learners who already have a secure B2 can start at week 3."],
] as const;

function BlockRow({ b, active, index = 0 }: { b: Block; active: boolean; index?: number }) {
  const Icon = ICON[b.key];
  return (
    <li className={clsx("enter flex items-start gap-3 py-3", !b.required && "[&>div]:opacity-80 [&>span]:opacity-80")} style={{ ["--i" as string]: Math.min(index, 9) }}>
      <span className={clsx("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors duration-300", b.doneAt ? "anim-pop bg-success text-white" : "bg-surface-2 text-muted")}>
        {b.doneAt ? <CheckCircle2 size={16} aria-label="Done" /> : <Icon size={16} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">{b.label}</span><span className="text-muted">· {b.minutes} min</span>{!b.required && <span className="chip !text-[11px]">extension</span>}{b.priority === "high" && <span className="chip !border-primary !text-[11px] !text-primary">your priority</span>}{b.priority === "maintenance" && b.key !== "focus" && <span className="chip !text-[11px]">lighter: a stronger area</span>}{b.result && <span className="chip !text-[11px]">{b.result}</span>}</p>
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
      <ol className="divide-y divide-line px-5 sm:px-6">{v.blocks.map((b, i) => <BlockRow key={`${b.key}-${b.skill ?? i}`} b={b} active index={i} />)}</ol>
      {onSkip && <div className="border-t border-line px-5 py-3 text-right sm:px-6"><button type="button" onClick={onSkip} className="btn btn-ghost !min-h-9 !px-3 text-sm"><SkipForward size={14} aria-hidden="true" /> Skip this day</button></div>}
    </section>
  );
}

export default function PlanPage() {
  const { profile, store, refresh, saved, toast } = useLearner();
  const { data, error } = useLearnerData();
  const settings = readPlan(profile);
  const [startLevel, setStartLevel] = useState<keyof typeof START_WEEK>("B2");
  const [weeks, setWeeks] = useState(6);
  const startWeek = START_WEEK[startLevel];
  const maxWeeks = 7 - startWeek;
  const [intensity, setIntensity] = useState<"full" | "focused">("focused");
  const pd = useMemo(() => (data ? { ...data, saved } : null), [data, saved]);
  const assessment = readAssessment(profile);
  const overrides = readOverrides(profile);
  const priorities = useMemo(() => (data ? computePriorities(assessment, data, overrides) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, JSON.stringify(assessment), JSON.stringify(overrides)]);
  const [personal, setPersonal] = useState(true);
  const prog = useMemo(() => (settings && pd ? planProgress(settings, pd, priorities) : null), [settings, pd, priorities]);
  const insights = useMemo(() => (settings && pd && prog ? planInsights(settings, pd, prog.days) : null), [settings, pd, prog]);

  async function save(next: PlanSettings | null) {
    await store.updateProfile({ preferences: { ...(profile?.preferences ?? {}), intensive: next } });
    await refresh();
  }
  async function start() { await save({ startedAt: new Date().toISOString(), intensity, startWeek, weeks: Math.min(weeks, maxWeeks), skipped: {}, personal: personal && !!assessment }); toast(personal && assessment ? "Your personal study plan has started" : "Intensive Study Plan started"); }
  async function setOverride(skill: Skill, p: Priority | "auto") {
    const next = { ...overrides }; if (p === "auto") delete next[skill]; else next[skill] = p;
    await store.updateProfile({ preferences: { ...(profile?.preferences ?? {}), priorities: next } });
    await refresh();
  }
  async function setPlanMode(on: boolean) { if (settings) { await save({ ...settings, personal: on }); toast(on ? "Using your personal plan" : "Using the standard plan"); } }
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
            <div className="mt-3 divide-y divide-line rounded-xl border border-line">{PRINCIPLES.map(([t, d]) => (
              <details key={t} className="group px-4 py-2.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold">{t}<ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" /></summary><p className="mt-1.5 text-[15px] text-muted">{d}</p></details>
            ))}</div>
            <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">The plan combines learning principles that are widely discussed in educational research; it has not itself been tested in a controlled study, and results depend on regular, active use.</p>
          </section>
          <section className="card p-5 sm:p-6" aria-labelledby="h-start">
            <h2 id="h-start" className="text-lg font-bold">Start the plan</h2>
            <p className="mt-1 text-sm text-muted">Each week has six themed study days and one review day. Self-paced: a new day opens when you finish the previous one.</p>
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Your starting level</legend>
              <div className="mt-2 grid grid-cols-4 gap-2" data-testid="plan-level">
                {(["B2", "B2+", "C1", "C2"] as const).map((l) => (
                  <label key={l} className={clsx("flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-2.5 font-semibold", startLevel === l ? "border-primary bg-primary-soft text-primary" : "border-line")}><input type="radio" name="lvl" className="sr-only" checked={startLevel === l} onChange={() => setStartLevel(l)} />{l}</label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">Starts at week {startWeek} of the programme. A self-estimate; the plan adapts to your results.</p>
            </fieldset>
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Duration</legend>
              <div className="mt-2 flex flex-wrap gap-2" data-testid="plan-duration">
                {Array.from({ length: maxWeeks }, (_, i) => i + 1).map((w) => (
                  <label key={w} className={clsx("cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold", Math.min(weeks, maxWeeks) === w ? "border-primary bg-primary-soft text-primary" : "border-line")}><input type="radio" name="dur" className="sr-only" checked={Math.min(weeks, maxWeeks) === w} onChange={() => setWeeks(w)} />{w} {w === 1 ? "week" : "weeks"}</label>
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
            <fieldset className="mt-4"><legend className="text-sm font-semibold">Version</legend>
              <div className="mt-2 grid gap-2">
                {([[true, "My personal plan", assessment ? "Weighted by your strengths and priorities (see below)" : "Complete the one-minute self-assessment below to enable it"], [false, "The standard plan", "The same balanced weighting for every learner"]] as const).map(([v, l, h]) => (
                  <label key={String(v)} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", (personal && !!assessment) === v ? "border-primary bg-primary-soft" : "border-line", v && !assessment && "opacity-60")}><input type="radio" name="ver" className="mt-1" checked={(personal && !!assessment) === v} disabled={v && !assessment} onChange={() => setPersonal(v)} /><span><span className="block font-semibold">{l}</span><span className="text-sm text-muted">{h}</span></span></label>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-primary mt-5 w-full" onClick={start}>Start the Intensive Study Plan</button>
          </section>
          <div className="lg:col-span-2"><PrioritiesCard priorities={priorities} hasAssessment={!!assessment} onOverride={setOverride} /></div>
          <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="h-weeks">
            <h2 id="h-weeks" className="text-lg font-bold">Week by week</h2>
            <div className="mt-3 divide-y divide-line rounded-xl border border-line" data-testid="plan-weeks">
              {WEEK_TITLES.map((t, i) => <WeekAccordion key={t} n={i + 1} title={t} />)}
            </div>
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
            <span className="chip" data-testid="plan-version">{settings.personal ? "Personal plan" : "Standard plan"}</span>
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" onClick={() => setPlanMode(!settings.personal)} disabled={!settings.personal && !assessment}>{settings.personal ? "Use the standard plan" : "Use my personal plan"}</button>
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" onClick={leave}>Leave plan</button>
          </div>

          {settings.personal && <PrioritiesCard priorities={priorities} hasAssessment={!!assessment} onOverride={setOverride} compact />}
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

/** The learner's six priorities, with the reasons behind each one and a manual override. */
function PrioritiesCard({ priorities, hasAssessment, onOverride, compact = false }: { priorities: SkillPriority[] | null; hasAssessment: boolean; onOverride: (s: Skill, p: Priority | "auto") => void; compact?: boolean }) {
  const [editing, setEditing] = useState(!hasAssessment && !compact);
  const [open, setOpen] = useState(!compact);
  if (!priorities) return null;
  const order: Priority[] = ["high", "medium", "maintenance"];
  const rows = [...priorities].sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || b.need - a.need);
  return (
    <section className="card overflow-hidden" aria-labelledby="h-prio" data-testid="personal-priorities">
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
        <SlidersHorizontal size={19} className="text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="h-prio" className="text-lg font-bold">Your learning priorities</h2>
          <p className="text-sm text-muted">{hasAssessment ? "From your self-assessment and your real results, recalculated as you study. Not AI: the rules are listed below." : "Take the one-minute self-assessment to personalise your plan."}</p>
        </div>
        {compact && <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"} <ChevronDown size={14} className={clsx("transition-transform duration-200", open && "rotate-180")} aria-hidden="true" /></button>}
      </div>
      {open && (
        <div className="fade-up border-t border-line px-5 py-4 sm:px-6">
          {hasAssessment && (
            <ul className="grid gap-2.5 md:grid-cols-2">
              {rows.map((r, i) => (
                <li key={r.skill} className="enter rounded-xl border border-line p-3" style={{ ["--i" as string]: i }} data-testid={`priority-${r.skill}`} data-priority={r.priority}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex-1 font-semibold">{SKILL_LABEL[r.skill]}</span>
                    <span className={clsx("chip", PRIORITY_CHIP[r.priority])}>{PRIORITY_LABEL[r.priority]}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true"><div className="bar-grow h-full rounded-full bg-primary/70" style={{ width: `${Math.round(10 + r.need * 90)}%` }} /></div>
                  <ul className="mt-2 space-y-0.5 text-[13.5px] text-muted">{r.reasons.slice(0, 3).map((x) => <li key={x}>{x}</li>)}</ul>
                  <label className="mt-2 flex items-center gap-2 text-sm"><span className="text-muted">Set:</span>
                    <select className="input !w-auto !py-1 text-sm" value={r.source === "manual" ? r.priority : "auto"} onChange={(e) => onOverride(r.skill, e.target.value as Priority | "auto")} aria-label={`${SKILL_LABEL[r.skill]} priority`}>
                      <option value="auto">Automatic</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="maintenance">Maintenance</option>
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            {!editing ? <button type="button" className="btn btn-primary" onClick={() => setEditing(true)} data-testid="edit-assessment"><UserRound size={14} aria-hidden="true" /> {hasAssessment ? "Edit my self-assessment" : "Take the self-assessment"}</button>
              : <div className="rounded-xl border border-line p-4"><LearningProfileForm submitLabel="Save and update my priorities" onDone={() => setEditing(false)} /></div>}
          </div>
          <details className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <summary className="cursor-pointer font-semibold">How personalisation works</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Each area gets a need score from your rating (1–5): 1–2 start as high priority, 3 as medium, 4–5 as maintenance.</li>
              <li>Once there is enough evidence (for example 15 grammar answers, 15 flashcard reviews, 2 listening logs or 2 assessed essays in the last 30 days), your results count for 60% and your self-rating for 40%.</li>
              <li>High priority (at most two areas): the block is required every day, gets a little more time, and an extra focus block uses the same day&apos;s theme and grammar.</li>
              <li>Maintenance: the area stays in the plan, shorter or every other day, so it is revised regularly. Nothing is ever removed.</li>
              <li>A priority you set yourself always wins: editing your self-assessment never overwrites it. The standard plan stays available at any time.</li>
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

const SKILL_ROWS: [string, (d: PlanDay) => string][] = [
  ["Grammar", (d) => (Array.isArray(d.grammar) ? d.grammar : [d.grammar]).map((g) => getLesson(g)?.title ?? g).join(", ")],
  ["Vocabulary", (d) => getTheme(d.theme)?.title ?? d.theme],
  ["Reading", (d) => getReading(d.reading)?.title ?? d.reading],
  ["Listening", (d) => d.listening.replace(/-/g, " ")],
  ["Writing", (d) => (d.writing.kind === "essay" ? getWritingPrompt(d.writing.slug)?.title ?? "Essay" : "Visual data description")],
  ["Speaking", (d) => d.speaking.replace(/-/g, " ")],
];

/** One programme week: its objectives and, per day, what each skill covers. */
function WeekAccordion({ n, title }: { n: number; title: string }) {
  const days = PROGRAMME.filter((d) => d.week === n && d.kind === "study");
  return (
    <details className="group px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-3">
        <span className="eyebrow w-16 shrink-0">Week {n}</span>
        <span className="flex-1 font-semibold">{title}</span>
        <span className="hidden text-xs text-muted sm:inline">{[...new Set(days.map((d) => d.level))].join(" → ")}</span>
        <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ol className="mt-3 space-y-3">
        {days.map((d) => (
          <li key={d.n} className="rounded-xl bg-surface-2 p-3">
            <p className="flex flex-wrap items-center gap-2"><span className="text-sm text-muted">Day {d.n}</span><span className="font-semibold">{d.title}</span><LevelBadge level={d.level} /></p>
            <p className="mt-0.5 text-sm">{d.objective}</p>
            <dl className="mt-2 grid gap-x-4 gap-y-0.5 text-[13px] sm:grid-cols-2">
              {SKILL_ROWS.map(([k, f]) => { const v = f(d); return v ? <div key={k} className="flex gap-2"><dt className="w-20 shrink-0 text-muted">{k}</dt><dd className="min-w-0">{v}</dd></div> : null; })}
            </dl>
          </li>
        ))}
      </ol>
    </details>
  );
}
