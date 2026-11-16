"use client";
import Link from "next/link";
import { useLearnerData } from "@/components/useLearnerData";
import { useLearner } from "@/components/StoreProvider";
import { computeStreak, daysThisWeek, mastery, studyDays, dayKey } from "@/lib/progress";
import { grammarLessons, getExercise } from "@/lib/content";
import { LevelBadge, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { isReviewable } from "@/lib/describe";

const BAND = { not_started: "Not started", practising: "Practising", secure: "Secure", mastered: "Mastered" } as const;

export default function ProgressPage() {
  const { data } = useLearnerData();
  const { profile, saved } = useLearner();
  if (!data || !profile) return <div aria-busy="true" className="h-40 animate-pulse rounded-2xl bg-surface-2" />;

  const days = studyDays(data.events);
  const weeks = 12;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (weeks - 1) * 7);
  const grid = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const x = new Date(start); x.setDate(start.getDate() + w * 7 + d); return x;
  }));
  const answered = data.responses.length;
  const correct = data.responses.filter((r) => r.correct).length;

  return (
    <>
      <PageHeader eyebrow="Me" title="Progress" intro="Every number here is calculated from your actual answers and activity. Nothing is estimated or rounded up." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Study streak" value={`${computeStreak(data.events)} d`} hint="Consecutive days with study" />
        <StatCard label="This week" value={`${daysThisWeek(data.events)} / ${profile.weeklyGoalDays}`} hint="Study days vs your goal" />
        <StatCard label="Answers" value={answered} hint={answered ? `${Math.round((correct / answered) * 100)}% correct overall` : "No answers yet"} />
        <StatCard label="Saved items" value={saved.filter(isReviewable).length} hint={`${data.writing.length} essays · ${data.speaking.length} speaking attempts`} />
      </div>

      <section className="card mt-6 p-5" aria-labelledby="h-activity">
        <h2 id="h-activity" className="text-lg font-bold">Activity, last {weeks} weeks</h2>
        <div className="mt-4 flex gap-1 overflow-x-auto" role="img" aria-label={`${days.size} study days recorded`}>
          {grid.map((week, w) => (
            <div key={w} className="flex flex-col gap-1">
              {week.map((d) => {
                const on = days.has(dayKey(d));
                const future = d > today;
                return <span key={d.toISOString()} title={d.toDateString()} className={`h-4 w-4 rounded-[4px] ${future ? "bg-transparent" : on ? "bg-primary" : "bg-surface-2"}`} />;
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="h-mastery">
        <h2 id="h-mastery" className="text-lg font-bold">Grammar mastery</h2>
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
      </section>

      <section className="card mt-6 p-5" aria-labelledby="h-attempts">
        <h2 id="h-attempts" className="text-lg font-bold">Exercise history</h2>
        {data.attempts.length === 0 ? <p className="mt-2 text-sm text-muted">Completed exercises will appear here.</p> : (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="text-muted"><th className="py-2 font-semibold">Exercise</th><th className="py-2 font-semibold">Score</th><th className="py-2 font-semibold">Date</th></tr></thead>
            <tbody>
              {[...data.attempts].reverse().slice(0, 15).map((a) => (
                <tr key={a.id} className="border-t border-line"><td className="py-2">{getExercise(a.exerciseSlug)?.title ?? a.exerciseSlug}</td><td className="py-2">{a.score} / {a.total}</td><td className="py-2">{new Date(a.completedAt).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
