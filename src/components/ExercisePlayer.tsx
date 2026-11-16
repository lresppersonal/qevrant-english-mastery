"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, BookOpen } from "lucide-react";
import type { Exercise, Question } from "@/lib/content/schema";
import { useLearner } from "./StoreProvider";
import { Rich, ProgressBar } from "./ui";
import { isCorrect } from "@/lib/answers";
import { usePathname } from "next/navigation";

/** On the lesson's own page a plain anchor is used, so the browser fires hashchange and the lesson switches to Theory. */
function RuleLink({ lesson, section, children, className }: { lesson: string; section: string; children: React.ReactNode; className: string }) {
  const path = usePathname();
  const href = `/grammar/${lesson}#${section}`;
  return path === `/grammar/${lesson}` ? <a href={`#${section}`} className={className}>{children}</a> : <Link href={href} className={className}>{children}</Link>;
}

type Result = { questionId: string; answer: string | number; correct: boolean };

export function ExercisePlayer({ exercise }: { exercise: Exercise }) {
  const { store } = useLearner();
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState<string | number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [finished, setFinished] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const feedbackRef = useRef<HTMLDivElement>(null);
  const q = exercise.questions[i];
  const ok = checked && isCorrect(q, answer);

  useEffect(() => { if (checked) feedbackRef.current?.focus(); }, [checked]);

  function check() {
    if (answer === null || (typeof answer === "string" && !answer.trim())) return;
    setChecked(true);
    setResults((r) => [...r, { questionId: q.id, answer: answer!, correct: isCorrect(q, answer) }]);
  }

  async function next() {
    if (i + 1 < exercise.questions.length) {
      setI(i + 1); setAnswer(null); setChecked(false);
      return;
    }
    setFinished(true);
    const score = results.filter((r) => r.correct).length;
    try {
      await store.saveAttempt(
        { exerciseSlug: exercise.slug, exerciseVersion: exercise.version, score, total: exercise.questions.length, startedAt: startedAt.current },
        results.map((r) => {
          const qq = exercise.questions.find((x) => x.id === r.questionId)!;
          return { questionId: r.questionId, targetRef: qq.targetSense ?? (exercise.target.type === "lesson" ? exercise.target.ref : exercise.slug), response: r.answer, correct: r.correct, errorTag: r.correct ? null : qq.errorTag ?? null };
        }),
      );
      await store.logEvent({ type: "exercise_completed", contentType: "exercise", contentRef: exercise.slug, payload: { score, total: exercise.questions.length } });
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  function restart() {
    setI(0); setAnswer(null); setChecked(false); setResults([]); setFinished(false); setSaveError(null);
    startedAt.current = new Date().toISOString();
  }

  if (finished) {
    const score = results.filter((r) => r.correct).length;
    const wrong = exercise.questions.filter((qq) => results.find((r) => r.questionId === qq.id && !r.correct));
    return (
      <div className="card p-6" data-testid="exercise-summary">
        <p className="eyebrow">Result</p>
        <p className="mt-1 font-display text-4xl font-extrabold">{score} / {exercise.questions.length}</p>
        {saveError ? <p role="alert" className="mt-2 text-sm text-danger">Your result couldn't be saved: {saveError}</p>
          : <p className="mt-2 text-sm text-muted">Saved to your progress.</p>}
        {wrong.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold">Review what you missed</p>
            <ul className="mt-3 space-y-2">
              {wrong.map((qq) => (
                <li key={qq.id} className="rounded-xl bg-surface-2 px-4 py-3 text-[15px]">
                  <p><Rich text={qq.prompt} /></p>
                  {qq.theoryAnchor && (
                    <RuleLink lesson={qq.theoryAnchor.lesson} section={qq.theoryAnchor.section} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      <BookOpen size={15} aria-hidden="true" /> Review the rule
                    </RuleLink>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={restart} className="btn btn-ghost mt-6"><RotateCcw size={16} aria-hidden="true" /> Try again</button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="text-sm font-semibold text-muted">Question {i + 1} of {exercise.questions.length}</span>
        {q.format && <span className="chip hidden sm:inline-flex">{q.format}</span>}
        {q.level && <span className="chip">{q.level}</span>}
        <div className="flex-1"><ProgressBar value={i / exercise.questions.length} label="Exercise progress" /></div>
      </div>
      <p id={`prompt-${q.id}`} className="text-lg font-medium leading-relaxed"><Rich text={q.prompt} /></p>

      <div className="mt-5">
        {q.kind === "choice" ? (
          <div role="radiogroup" aria-labelledby={`prompt-${q.id}`} className="grid gap-2">
            {q.options.map((opt, k) => {
              const picked = answer === k;
              const showRight = checked && k === q.answer;
              const showWrong = checked && picked && k !== q.answer;
              return (
                <button key={k} role="radio" aria-checked={picked} disabled={checked} onClick={() => setAnswer(k)}
                  className={clsx("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    showRight ? "border-success bg-[color-mix(in_srgb,var(--success)_10%,var(--surface))]"
                      : showWrong ? "border-danger bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface))]"
                        : picked ? "border-primary bg-primary-soft" : "border-line hover:border-primary")}>
                  <span className={clsx("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold", picked ? "border-primary" : "border-line")}>{String.fromCharCode(65 + k)}</span>
                  <span className="flex-1">{opt}</span>
                  {showRight && <CheckCircle2 size={18} className="text-success" aria-label="Correct answer" />}
                  {showWrong && <XCircle size={18} className="text-danger" aria-label="Your answer" />}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="block">
            <span className="sr-only">Your answer</span>
            <input className="input text-lg" value={(answer as string) ?? ""} disabled={checked} autoComplete="off" spellCheck={false}
              onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") check(); }} placeholder="Type your answer" />
          </label>
        )}
      </div>

      {checked && (
        <div ref={feedbackRef} tabIndex={-1} role="status" className={clsx("mt-5 rounded-xl border px-4 py-3 outline-none", ok ? "border-success/50" : "border-danger/50")}>
          <p className={clsx("flex items-center gap-2 font-bold", ok ? "text-success" : "text-danger")}>
            {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
            {ok ? "Correct" : q.kind === "text" ? `Not quite. Answer: ${q.accepted[0]}` : "Not quite"}
          </p>
          <p className="mt-1.5 text-[15.5px] leading-relaxed"><Rich text={q.explanation} /></p>
          {q.theoryAnchor && (
            <RuleLink lesson={q.theoryAnchor.lesson} section={q.theoryAnchor.section} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
              <BookOpen size={15} aria-hidden="true" /> Review the rule
            </RuleLink>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {!checked ? (
          <button className="btn btn-primary" onClick={check} disabled={answer === null || (typeof answer === "string" && !answer.trim())}>Check</button>
        ) : (
          <button className="btn btn-primary" onClick={next}>{i + 1 < exercise.questions.length ? "Next" : "See result"} <ArrowRight size={16} aria-hidden="true" /></button>
        )}
      </div>
    </div>
  );
}
