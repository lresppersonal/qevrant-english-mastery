"use client";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ArrowLeft, Shuffle, Target, TrendingDown, Repeat } from "lucide-react";
import { useLearnerData } from "@/components/useLearnerData";
import { ExercisePlayer } from "@/components/ExercisePlayer";
import { buildSmartSet, mistakeQueue, type SmartMode } from "@/lib/learning";
import { grammarLessons, rulesFor } from "@/lib/content";
import { PROGRAMME } from "@/lib/plan/programme";

const MODES: { mode: Exclude<SmartMode, "lesson">; label: string; icon: typeof Target }[] = [
  { mode: "mistakes", label: "My mistakes", icon: Repeat },
  { mode: "weak", label: "Weak areas", icon: TrendingDown },
  { mode: "mixed", label: "Mixed review", icon: Shuffle },
];

function Smart() {
  const params = useSearchParams();
  const lesson = params.get("lesson") ?? undefined;
  const planDay = PROGRAMME.find((d) => d.n === Number(params.get("plan")) && Array.isArray(d.grammar));
  const planLessons = planDay ? (planDay.grammar as string[]) : undefined;
  const mode: SmartMode = lesson || planLessons ? "lesson" : ((["mistakes", "weak", "mixed"].includes(params.get("mode") ?? "") ? params.get("mode") : "mixed") as SmartMode);
  const { data, error } = useLearnerData();
  const [seed, setSeed] = useState(() => Date.now());
  const lessonTitle = lesson ? grammarLessons.find((l) => l.slug === lesson)?.title : null;
  const set = useMemo(() => (data ? buildSmartSet({ responses: data.responses, attempts: data.attempts }, mode, planLessons
    ? { lessons: planLessons, slug: `smart-plan-${planDay!.n}`, title: planDay!.title, seed, size: 12 }
    : { lesson, seed, size: 10 }) : null), [data, mode, lesson, seed, planLessons, planDay]);
  const mistakes = data ? mistakeQueue(data.responses, data.attempts).length : 0;

  return (
    <div className="max-w-3xl">
      <Link href="/grammar/practice" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Grammar practice</Link>
      <p className="eyebrow">Adaptive practice</p>
      <h1 className="text-3xl font-extrabold">{planDay ? `Study plan · Day ${planDay.n}: ${planDay.kind === "review" ? "grammar check" : "mixed retrieval"}` : lessonTitle ? `Practise: ${lessonTitle}` : "Smart practice"}</h1>
      <p className="mt-2 text-muted">Sets are built from your own answers: questions you got wrong come back until you answer them correctly, and weaker topics appear more often.</p>

      {planDay && <p className="mt-3"><Link href="/plan" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">← Back to the study plan</Link></p>}
      {!lesson && !planDay && (
        <nav aria-label="Practice mode" className="mt-5 flex flex-wrap gap-2">
          {MODES.map(({ mode: m, label, icon: Icon }) => (
            <Link key={m} href={`/practice/smart?mode=${m}`} aria-current={mode === m ? "page" : undefined}
              className={clsx("chip gap-1.5 !py-2 !px-3.5 text-sm", mode === m && "!border-primary !bg-primary-soft !text-primary")}>
              <Icon size={15} aria-hidden="true" /> {label}{m === "mistakes" && data ? ` (${mistakes})` : ""}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6" data-testid="smart-practice">
        {error ? <p role="alert" className="text-danger">Your progress couldn&apos;t be loaded: {error}</p>
          : !data ? <div className="skeleton h-64 rounded-2xl" aria-label="Loading" />
          : !set ? (
            <div className="card p-6">
              <p className="font-semibold">{mode === "mistakes" ? "No mistakes waiting for review." : "Not enough questions for this set yet."}</p>
              <p className="mt-1 text-muted">{mode === "mistakes" ? "Answers you get wrong in any exercise will appear here so you can try them again." : "Try another mode or a grammar topic."}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/practice/smart?mode=mixed" className="btn btn-primary">Start a mixed review</Link>
                <Link href="/grammar" className="btn btn-ghost">Browse grammar</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-[15px] text-muted">{set.exercise.instructions}</p>
              <ExercisePlayer key={`${set.exercise.slug}-${seed}`} exercise={set.exercise} rules={rulesFor([set.exercise])} />
              <button className="btn btn-ghost mt-4" onClick={() => setSeed(Date.now())}><Shuffle size={16} aria-hidden="true" /> New set</button>
            </>
          )}
      </div>
    </div>
  );
}

export default function SmartPracticePage() {
  return <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}><Smart /></Suspense>;
}
