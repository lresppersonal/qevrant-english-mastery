"use client";
import Link from "next/link";
import { ArrowRight, Flame, RotateCcw, CalendarCheck, Bookmark, PenLine, Mic } from "lucide-react";
import { useLearner } from "@/components/StoreProvider";
import { useLearnerData } from "@/components/useLearnerData";
import { computeStreak, daysThisWeek, dueItems } from "@/lib/progress";
import { getWritingPrompt, getSpeakingPrompt } from "@/lib/content";
import { ProgressBar } from "@/components/ui";

export default function Dashboard() {
  const { profile, saved } = useLearner();
  const { data, error } = useLearnerData();

  if (error) return <p role="alert" className="text-danger">Couldn't load your progress: {error}</p>;
  if (!data || !profile) return <DashboardSkeleton />;

  const streak = computeStreak(data.events);
  const week = daysThisWeek(data.events);
  const due = dueItems(saved, data.cards).length;
  const name = profile.displayName?.split(" ")[0];
  const recentFeedback = [
    ...data.writing.map((w) => ({ kind: "writing" as const, at: w.createdAt, title: getWritingPrompt(w.promptSlug)?.title ?? w.promptSlug, href: `/writing/${w.promptSlug}` })),
    ...data.speaking.map((s) => ({ kind: "speaking" as const, at: s.createdAt, title: getSpeakingPrompt(s.promptSlug)?.title ?? s.promptSlug, href: `/speaking/${s.promptSlug}` })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);

  return (
    <>
      <header className="mb-8">
        <p className="eyebrow mb-2">Dashboard</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">{name ? `Good to see you, ${name}.` : "Welcome."}</h1>
      </header>

      {!profile.onboardedAt && (
        <div className="card mb-6 flex flex-wrap items-center gap-4 border-accent/60 p-5">
          <p className="flex-1"><strong>Set up your study plan.</strong> <span className="text-muted">Tell us your goals and level so we can suggest where to start. It takes a minute.</span></p>
          <Link href="/onboarding" className="btn btn-accent">Set up</Link>
        </div>
      )}

      <section className="card mb-6 flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center" aria-label="Continue learning">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{data.last ? "Continue where you left off" : "Start here"}</p>
          <p className="mt-1 font-display text-xl font-bold">{data.last?.label ?? "Education and Academia"}</p>
        </div>
        <Link href={data.last?.href ?? "/topics/education"} className="btn btn-primary">{data.last ? "Continue" : "Open topic"} <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/review" className="card p-5 hover:border-primary" data-testid="due-count">
          <p className="flex items-center gap-2 text-sm font-medium text-muted"><RotateCcw size={16} aria-hidden="true" /> Due for review</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{due}</p>
          <p className="mt-1 text-xs text-muted">{due ? "Start a review session" : "Nothing due right now"}</p>
        </Link>
        <div className="card p-5" data-testid="streak">
          <p className="flex items-center gap-2 text-sm font-medium text-muted"><Flame size={16} aria-hidden="true" /> Study streak</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{streak} {streak === 1 ? "day" : "days"}</p>
          <p className="mt-1 text-xs text-muted">Days in a row with real study</p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-muted"><CalendarCheck size={16} aria-hidden="true" /> This week</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{week} / {profile.weeklyGoalDays}</p>
          <div className="mt-2"><ProgressBar value={week / profile.weeklyGoalDays} label="Weekly goal" /></div>
        </div>
        <Link href="/library" className="card p-5 hover:border-primary" data-testid="saved-count">
          <p className="flex items-center gap-2 text-sm font-medium text-muted"><Bookmark size={16} aria-hidden="true" /> Personal Vocabulary</p>
          <p className="mt-1 font-display text-3xl font-extrabold">{saved.filter((s) => s.itemType !== "lesson_section").length}</p>
          <p className="mt-1 text-xs text-muted">Saved words and phrases</p>
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="h-practice">
          <h2 id="h-practice" className="text-lg font-bold">Practise with AI feedback</h2>
          <p className="mt-1 text-sm text-muted">Detailed practice feedback on your speaking and academic essays, linked to the grammar you need.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/writing" className="btn btn-ghost"><PenLine size={16} aria-hidden="true" /> Write an essay</Link>
            <Link href="/speaking" className="btn btn-ghost"><Mic size={16} aria-hidden="true" /> Speak</Link>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="h-recent">
          <h2 id="h-recent" className="text-lg font-bold">Recent feedback</h2>
          {recentFeedback.length === 0 ? <p className="mt-2 text-sm text-muted">Your essays and speaking attempts will appear here.</p> : (
            <ul className="mt-2 divide-y divide-line">
              {recentFeedback.map((r) => (
                <li key={r.at}><Link href={r.href} className="flex items-center gap-3 py-2.5 hover:text-primary">
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
    <div aria-busy="true" aria-label="Loading dashboard" className="animate-pulse space-y-4">
      <div className="h-10 w-72 rounded-lg bg-surface-2" />
      <div className="h-24 rounded-2xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface-2" />)}</div>
    </div>
  );
}
