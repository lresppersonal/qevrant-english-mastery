"use client";
import Link from "next/link";
import { useMemo } from "react";
import clsx from "clsx";
import { ArrowRight, Flame, RotateCcw, Bookmark, PenLine, Mic, Target, CheckCircle2, Clock, Compass, TrendingDown, Repeat, Sparkles } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { computeStreak, daysThisWeek } from "@/lib/progress";
import { getWritingPrompt, getSpeakingPrompt } from "@/lib/content";
import { todaysPlan, cycleInfo, type LearnerSnapshot } from "@/lib/learning";
import { LevelBadge } from "@/components/ui";
import { CountUp, Ring } from "@/components/Motion";
import { InstallBanner } from "@/components/PwaSupport";
import { LearningCycle } from "@/components/LearningCycle";

const STAGE_STYLE: Record<string, string> = {
  Understand: "text-primary border-primary/40", Recognise: "text-primary border-primary/40", Practise: "text-accent-text border-accent/60",
  Produce: "text-success border-success/50", Revise: "text-muted border-line",
};

export default function Dashboard() {
  const { profile, saved } = useLearner();
  const { data, error } = useLearnerData();

  const plan = useMemo(() => {
    if (!data || !profile) return null;
    const snap: LearnerSnapshot = { events: data.events, responses: data.responses, attempts: data.attempts, cards: data.cards, reviewLogs: data.reviewLogs, saved, writing: data.writing, speaking: data.speaking, listening: data.listening, selfLevel: profile.selfLevel };
    return todaysPlan(snap);
  }, [data, profile, saved]);

  if (error) return <p role="alert" className="text-danger">Couldn't load your progress: {error}</p>;
  if (!data || !profile || !plan) return <DashboardSkeleton />;

  const streak = computeStreak(data.events);
  const week = daysThisWeek(data.events);
  const name = profile.displayName?.split(" ")[0];
  const minutes = plan.tasks.filter((t) => !t.done).reduce((n, t) => n + t.minutes, 0);
  const recentFeedback = [
    ...data.writing.filter((w) => w.status !== "failed").map((w) => ({ kind: "writing" as const, at: w.createdAt, title: getWritingPrompt(w.promptSlug)?.title ?? w.promptSlug, href: `/writing/${w.promptSlug}` })),
    ...data.speaking.map((s) => ({ kind: "speaking" as const, at: s.createdAt, title: getSpeakingPrompt(s.promptSlug)?.title ?? "Speaking studio", href: s.promptSlug.startsWith("bank:") ? "/speaking" : `/speaking/${s.promptSlug}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <header className="enter mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your learning today</p>
          <h1 className="text-3xl font-extrabold md:text-4xl">{greeting}{name ? `, ${name}` : ""}.</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted" title={plan.level.basis}>
          Working level <LevelBadge level={plan.level.level} />
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

      {/* 1. What should I study today? */}
      <section className="card enter overflow-hidden" style={{ ["--i" as string]: 1 }} aria-labelledby="h-today" data-testid="today-plan">
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* 2. What should I revise? */}
        <section className="card enter p-5" style={{ ["--i" as string]: 3 }} aria-labelledby="h-revise">
          <h2 id="h-revise" className="flex items-center gap-2 text-lg font-bold"><Repeat size={18} aria-hidden="true" /> Revise</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li><Link href="/review" className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2" data-testid="due-count"><span>Words due</span><strong className="font-display text-xl"><CountUp value={plan.revise.dueWords} /></strong></Link></li>
            <li><Link href="/practice/smart?mode=mistakes" className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2" data-testid="mistake-count"><span>Questions to retry</span><strong className="font-display text-xl"><CountUp value={plan.revise.mistakes} /></strong></Link></li>
            {plan.revise.fading.slice(0, 2).map((f) => (
              <li key={f.slug}><Link href={`/practice/smart?lesson=${f.slug}`} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">Refresh <strong>{f.title}</strong> <span className="text-muted">· last practised {f.days} days ago</span></Link></li>
            ))}
          </ul>
          {plan.revise.dueWords + plan.revise.mistakes === 0 && plan.revise.fading.length === 0 && <p className="mt-2 text-sm text-muted">Nothing to revise right now. Save words while reading to build your review deck.</p>}
        </section>

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card enter flex items-center gap-4 p-5" style={{ ["--i" as string]: 6 }} data-testid="streak">
          <Flame size={28} className="text-accent" aria-hidden="true" />
          <div><p className="text-sm font-medium text-muted">Study streak</p><p className="font-display text-2xl font-extrabold"><CountUp value={streak} /> {streak === 1 ? "day" : "days"}</p></div>
        </div>
        <div className="card enter flex items-center gap-4 p-5" style={{ ["--i" as string]: 7 }}>
          <Ring value={week / profile.weeklyGoalDays} size={56} stroke={6} label="Weekly goal"><span className="text-xs font-bold">{week}/{profile.weeklyGoalDays}</span></Ring>
          <div><p className="text-sm font-medium text-muted">This week</p><p className="text-sm">{week >= profile.weeklyGoalDays ? "Goal reached — well done" : `${profile.weeklyGoalDays - week} more study day${profile.weeklyGoalDays - week === 1 ? "" : "s"} to your goal`}</p></div>
        </div>
        <Link href="/library" className="card card-link enter flex items-center gap-4 p-5" style={{ ["--i" as string]: 8 }} data-testid="saved-count">
          <Bookmark size={26} className="text-primary" aria-hidden="true" />
          <div><p className="text-sm font-medium text-muted">Personal Vocabulary</p><p className="font-display text-2xl font-extrabold"><CountUp value={saved.filter((s) => s.itemType !== "lesson_section").length} /></p></div>
        </Link>
        <Link href="/progress" className="card card-link enter flex items-center gap-4 p-5" style={{ ["--i" as string]: 9 }}>
          <RotateCcw size={26} className="text-primary" aria-hidden="true" />
          <div><p className="text-sm font-medium text-muted">Exercises completed</p><p className="font-display text-2xl font-extrabold"><CountUp value={data.attempts.length} /></p></div>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="h-practice">
          <h2 id="h-practice" className="text-lg font-bold">Use your English</h2>
          <p className="mt-1 text-sm text-muted">Produce language and get AI feedback that explains how to improve your own sentences.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/writing" className="btn btn-ghost"><PenLine size={16} aria-hidden="true" /> Write an essay</Link>
            <Link href="/speaking" className="btn btn-ghost"><Mic size={16} aria-hidden="true" /> Speak</Link>
            <Link href="/practice/smart?mode=mixed" className="btn btn-ghost"><Target size={16} aria-hidden="true" /> Mixed grammar review</Link>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="h-recent">
          <h2 id="h-recent" className="text-lg font-bold">Recent feedback</h2>
          {recentFeedback.length === 0 ? <p className="mt-2 text-sm text-muted">Your essays and speaking attempts will appear here.</p> : (
            <ul className="mt-2 divide-y divide-line">
              {recentFeedback.map((r) => (
                <li key={r.at}><Link href={r.href} className="flex items-center gap-3 py-2.5 transition-colors hover:text-primary">
                  {r.kind === "writing" ? <PenLine size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
                  <span className="flex-1 font-medium">{r.title}</span>
                  <span className="text-xs text-muted">{new Date(r.at).toLocaleDateString()}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="space-y-4">
      <div className="skeleton h-10 w-72" />
      <div className="skeleton h-64 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>
    </div>
  );
}
