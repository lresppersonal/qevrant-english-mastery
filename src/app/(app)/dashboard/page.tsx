"use client";
import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import { ArrowRight, Target, CheckCircle2, Clock, Compass, TrendingDown, Sparkles, BookOpen, Newspaper, Trophy, History } from "lucide-react";
import { useLearner, dailyGoalOf } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { getLesson, getReading, getExercise } from "@/lib/content";
import { streakState } from "@/lib/streak";
import { FlameGoal, TIER_LABEL } from "@/components/StreakFlame";

import { todaysPlan, cycleInfo, type LearnerSnapshot } from "@/lib/learning";
import { LevelBadge } from "@/components/ui";
import { CountUp } from "@/components/Motion";
import { InstallBanner } from "@/components/PwaSupport";
import { LearningCycle } from "@/components/LearningCycle";
import { WeeklySkillProgress } from "@/components/WeeklySkillProgress";
import { weeklySkillGrid } from "@/lib/weekly";
import { readPlan, planProgress } from "@/lib/plan/engine";
import { computePriorities, readAssessment, readOverrides } from "@/lib/plan/personal";

const STAGE_STYLE: Record<string, string> = {
  Understand: "text-primary border-primary/40", Recognise: "text-primary border-primary/40", Practise: "text-accent-text border-accent/60",
  Produce: "text-success border-success/50", Revise: "text-muted border-line",
};

export default function Dashboard() {
  const { profile, saved, streak: live, store } = useLearner();
  const { data, error } = useLearnerData();

  const plan = useMemo(() => {
    if (!data || !profile) return null;
    const snap: LearnerSnapshot = { events: data.events, responses: data.responses, attempts: data.attempts, cards: data.cards, reviewLogs: data.reviewLogs, saved, writing: data.writing, speaking: data.speaking, listening: data.listening, selfLevel: profile.selfLevel };
    return todaysPlan(snap);
  }, [data, profile, saved]);

  const planSettings = readPlan(profile);
  const grid = useMemo(() => {
    if (!data) return null;
    const pd = { ...data, saved };
    const days = planSettings ? planProgress(planSettings, pd, computePriorities(readAssessment(profile), data, readOverrides(profile))).days : null;
    return weeklySkillGrid(data.events, days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, saved, profile]);

  if (error) return <p role="alert" className="text-danger">Couldn't load your progress: {error}</p>;
  if (!data || !profile || !plan || !grid) return <DashboardSkeleton />;

  // Live state from the provider (updates after every activity); computed here as a fallback while it loads.
  const st = live ?? streakState(data.events, dailyGoalOf(profile));
  const streak = st.streak;
  const recent = recentlyStudied(data.events);
  const name = profile.displayName?.split(" ")[0];
  const minutes = plan.tasks.filter((t) => !t.done).reduce((n, t) => n + t.minutes, 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <header className="enter mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your learning today</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">{greeting}{name ? `, ${name}` : ""}.</h1>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-sm text-muted">
          <span className="flex items-center gap-2" title={plan.level.basis}>Working level <LevelBadge level={plan.level.level} /></span>
          <span className="flex flex-wrap items-center justify-end gap-x-2" data-testid="account-summary">
            {store.mode === "supabase" ? <>Signed in as <span className="font-semibold text-ink">{profile?.email}</span></> : <>Demo mode · progress saved in this browser</>}
            <span aria-hidden="true">·</span><Link href="/settings" className="font-semibold text-primary underline-offset-4 hover:underline">Account</Link>
          </span>
        </div>
      </header>

      <InstallBanner />

      {data.last && (
        <Link href={data.last.href} className="card card-link enter mb-6 flex items-center gap-4 p-4" data-testid="continue-card">
          <ArrowRight size={18} className="text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="eyebrow block">Continue where you left off</span><span className="font-semibold">{data.last.label}</span></span>
          <span className="text-sm font-semibold text-primary">Continue</span>
        </Link>
      )}

      {!profile.onboardedAt && (
        <div className="card enter mb-6 flex flex-wrap items-center gap-4 border-accent/60 p-5">
          <p className="flex-1"><strong>Set up your study plan.</strong> <span className="text-muted">Tell us your goals and level so your plan starts in the right place. It takes a minute.</span></p>
          <Link href="/onboarding" className="btn btn-accent">Set up</Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
      {/* Streak and daily goal */}
      <section id="streak" className={clsx("card enter relative flex scroll-mt-24 flex-col overflow-hidden p-5", st.studiedToday && "streak-card-lit")} style={{ ["--i" as string]: 1 }} aria-labelledby="h-streak" data-testid="streak">
        <div className="flex items-center gap-4">
          <FlameGoal s={st} size={84} />
          <div className="min-w-0">
            <h2 id="h-streak" className="text-sm font-medium text-muted">Study streak</h2>
            <p className="font-display text-3xl font-extrabold leading-tight"><CountUp value={streak} /> {streak === 1 ? "day" : "days"}</p>
            <p className={clsx("text-sm", st.atRisk ? "font-semibold text-accent-text" : "text-muted")}>
              {st.atRisk ? "Study today to keep your streak" : st.studiedToday ? (st.goalMet ? "Today's goal complete" : "Today counts") : "Start a streak today"}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">Daily goal</span><span className="tabular-nums text-muted" data-testid="daily-goal-progress">{Math.min(st.today, st.goal)} / {st.goal} activities</span></div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label="Daily goal" aria-valuemin={0} aria-valuemax={st.goal} aria-valuenow={Math.min(st.today, st.goal)}>
            <div className={clsx("h-full rounded-full", st.goalMet ? "bg-success" : "bg-accent")} style={{ width: `${Math.min(100, (st.today / st.goal) * 100)}%` }} />
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
          {st.week.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-1" aria-label={`${d.day}: ${d.studied ? "studied" : "no activity"}`}>
              <span className={clsx("grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold transition-colors",
                d.studied ? "border-transparent bg-[linear-gradient(180deg,#F2C76E,#E0A33A)] text-[#2B1700]" : "border-line text-muted", d.isToday && "ring-2 ring-[var(--ring)] ring-offset-2 ring-offset-[var(--surface)]")}>
                {d.studied ? <CheckCircle2 size={14} aria-hidden="true" /> : ""}
              </span>
              <span className={clsx("text-[11px]", d.isToday ? "font-bold text-ink" : "text-muted")} aria-hidden="true">{d.label}</span>
            </li>
          ))}
        </ol>
        <div className="mt-auto pt-4">
          <p className="mb-1.5 text-xs font-semibold text-muted">Milestones</p>
          <ol className="flex gap-1" aria-label="Streak milestones">
            {[3, 7, 14, 30, 100, 365].map((m) => (
              <li key={m} className={clsx("flex-1 rounded-md py-1 text-center text-[11px] font-bold tabular-nums transition-colors",
                streak >= m ? "bg-[linear-gradient(180deg,#F8C860,#EE9A3A)] text-[#2B1700]" : m === st.next ? "border border-accent text-accent-text" : "border border-line text-muted")}
                aria-label={`${m} days${streak >= m ? ", reached" : m === st.next ? ", next" : ""}`}>{m}</li>
            ))}
          </ol>
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Trophy size={13} aria-hidden="true" /> Best: {st.best} {st.best === 1 ? "day" : "days"}</span>
          {st.next && <span>Next milestone: {st.next} days</span>}
          {st.streak > 0 && <span className="chip !text-[11px]">{TIER_LABEL[st.tier]}</span>}
        </p>
      </section>

      {/* 1. What should I study today? */}
      <section className="card enter overflow-hidden lg:col-span-2" style={{ ["--i" as string]: 2 }} aria-labelledby="h-today" data-testid="today-plan">
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-gradient-to-r from-primary-soft to-surface px-5 py-4 sm:px-6">
          <Compass size={20} className="text-primary" aria-hidden="true" />
          <h2 id="h-today" className="flex-1 text-xl font-bold">Today's plan</h2>
          <span className="flex items-center gap-1.5 text-sm text-muted"><Clock size={15} aria-hidden="true" /> about {minutes} min</span>
        </div>
        <ol className="divide-y divide-line">
          {plan.tasks.map((t, n) => (
            <li key={t.key} className="enter" style={{ ["--i" as string]: n + 2 }}>
              <Link href={t.href} className={clsx("group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:px-6", t.done && "opacity-70")}>
                <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 font-bold", t.done ? "border-success bg-success text-white" : "border-line text-muted")}>
                  {t.done ? <CheckCircle2 size={18} aria-label="Done" /> : n + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><span className={clsx("chip", STAGE_STYLE[t.stage])}>{t.stage}</span><span className="text-xs text-muted">{t.minutes} min</span></span>
                  <span className="mt-1 block font-semibold">{t.title}</span>
                  <span className="block text-sm text-muted">{t.reason}</span>
                </span>
                <ArrowRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        {/* 3. What are my weakest areas? */}
        <section className="card enter p-5" style={{ ["--i" as string]: 4 }} aria-labelledby="h-weak" data-testid="weak-areas">
          <h2 id="h-weak" className="flex items-center gap-2 text-lg font-bold"><TrendingDown size={18} aria-hidden="true" /> Weakest areas</h2>
          {plan.weak.length === 0 ? <p className="mt-3 text-sm text-muted">Not enough evidence yet. After a few exercises, essays or speaking answers, your weak spots appear here automatically.</p> : (
            <ul className="mt-3 space-y-2">
              {plan.weak.slice(0, 3).map((w) => (
                <li key={w.key} className="rounded-lg border border-line px-3 py-2">
                  <Link href={w.href} className="font-semibold hover:text-primary">{w.label}</Link>
                  <p className="text-sm text-muted">{w.detail}</p>
                  {w.practiceHref && <Link href={w.practiceHref} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Target size={14} aria-hidden="true" /> Targeted practice</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. What should I improve next? */}
        <section className="card enter p-5" style={{ ["--i" as string]: 5 }} aria-labelledby="h-next">
          <h2 id="h-next" className="flex items-center gap-2 text-lg font-bold"><Sparkles size={18} aria-hidden="true" /> Next in your path</h2>
          {plan.next ? (
            <>
              <p className="mt-3 flex items-center gap-2"><LevelBadge level={plan.next.level} /><Link href={`/grammar/${plan.next.slug}`} className="font-semibold hover:text-primary">{plan.next.title}</Link></p>
              <p className="mt-1 text-sm text-muted">{plan.next.summary}</p>
              {cycleInfo(plan.next.slug) && <div className="mt-3"><LearningCycle info={cycleInfo(plan.next.slug)!} compact /></div>}
            </>
          ) : <p className="mt-3 text-sm text-muted">You've started every grammar topic. Keep them fresh with mixed review.</p>}
          {plan.neglected[0] && <p className="mt-3 text-sm">Also: <Link href={plan.neglected[0].href} className="font-semibold text-primary">{plan.neglected[0].label}</Link> <span className="text-muted">{Number.isFinite(plan.neglected[0].days) ? `— not practised for ${Math.round(plan.neglected[0].days)} days` : "— not tried yet"}</span></p>}
        </section>
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><WeeklySkillProgress grid={grid} hasPlan={!!planSettings} /></div>
        <section className="card enter p-5" style={{ ["--i" as string]: 10 }} aria-labelledby="h-studied" data-testid="recently-studied">
          <h2 id="h-studied" className="flex items-center gap-2 text-lg font-bold"><History size={18} aria-hidden="true" /> Recently studied</h2>
          {recent.length === 0 ? <p className="mt-2 text-sm text-muted">Lessons, texts and exercises you open will appear here.</p> : (
            <ul className="mt-2 divide-y divide-line">
              {recent.map((r) => (
                <li key={r.href}><Link href={r.href} className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary">
                  <r.icon size={16} className="shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
                  <span className="shrink-0 text-xs text-muted">{ago(r.at)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

/** Distinct lessons, texts and exercises from the activity log, newest first. */
function recentlyStudied(events: { type: string; contentRef: string | null; createdAt: string }[]) {
  const out: { href: string; title: string; at: string; icon: typeof BookOpen }[] = [];
  const seen = new Set<string>();
  for (const e of [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const ref = e.contentRef ?? "";
    let item: (typeof out)[number] | null = null;
    if (e.type === "lesson_section_viewed") { const l = getLesson(ref.split("#")[0]); if (l) item = { href: `/grammar/${l.slug}`, title: l.title, at: e.createdAt, icon: BookOpen }; }
    else if (e.type === "reading_completed") { const r = getReading(ref); if (r) item = { href: `/reading/${r.slug}`, title: r.title, at: e.createdAt, icon: Newspaper }; }
    else if (e.type === "exercise_completed") { const x = getExercise(ref); if (x) item = { href: x.target.type === "lesson" ? `/grammar/${x.target.ref}/practice` : `/practice/${x.slug}`, title: x.title, at: e.createdAt, icon: Target }; }
    if (item && !seen.has(item.href)) { seen.add(item.href); out.push(item); }
    if (out.length >= 5) break;
  }
  return out;
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-4">
      <div className="skeleton h-10 w-72" />
      <div className="grid gap-4 lg:grid-cols-3"><div className="skeleton h-72 rounded-2xl" /><div className="skeleton h-72 rounded-2xl lg:col-span-2" /></div>
      <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
    </div>
  );
}
