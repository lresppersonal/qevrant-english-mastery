"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, BookOpen, Sparkles, Target, Loader2 } from "lucide-react";
import { Ring } from "./Motion";
import { useAiStatus } from "./useAiStatus";
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
type Explanation = { whyWrong: string; whyCorrect: string; rule: string; example: string };

/** "Why your answer doesn't fit": a real AI call (server looks the question up itself). Only shown on request. */
function ExplainMistake({ q, answer, exerciseSlug }: { q: Question; answer: string | number; exerciseSlug: string }) {
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; data?: Explanation; error?: string }>({ status: "idle" });
  const ai = useAiStatus();
  async function ask() {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/ai/explain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseSlug, questionId: q.id, answer }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "The explanation couldn't be loaded.");
      setState({ status: "done", data: j.explanation });
    } catch (e) { setState({ status: "error", error: (e as Error).message }); }
  }
  if (state.status === "done" && state.data) return (
    <div className="mt-3 rounded-lg bg-surface-2 px-3.5 py-3 text-[15px] leading-relaxed anim-pop" data-testid="ai-explanation">
      <p className="eyebrow flex items-center gap-1.5"><Sparkles size={13} aria-hidden="true" /> Why your answer doesn&apos;t fit · AI</p>
      <p className="mt-1">{state.data.whyWrong}</p>
      <p className="mt-2 text-muted"><span className="font-semibold text-ink">Another example: </span>{state.data.example}</p>
      <p className="mt-2 text-xs text-muted">AI-generated explanation — check it against the rule if anything seems unclear.</p>
    </div>
  );
  if (!ai?.enabled) return null; // no AI server behind this copy: the rule and explanation above still apply
  return (
    <div className="mt-3">
      <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={ask} disabled={state.status === "loading"}>
        {state.status === "loading" ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
        {state.status === "loading" ? "Explaining…" : "Why doesn't my answer fit?"}
      </button>
      {state.status === "error" && <p role="alert" className="mt-1.5 text-sm text-danger">{state.error}</p>}
    </div>
  );
}

function shown(q: Question, a: string | number) { return q.kind === "choice" && typeof a === "number" ? q.options[a] : String(a); }

export function ExercisePlayer({ exercise, rules }: { exercise: Exercise; rules?: Record<string, string> }) {
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
  const rule = q.theoryAnchor && rules ? rules[`${q.theoryAnchor.lesson}#${q.theoryAnchor.section}`] ?? null : null;

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
          return { questionId: r.questionId, targetRef: qq.targetSense ?? qq.theoryAnchor?.lesson ?? (exercise.target.type === "lesson" ? exercise.target.ref : exercise.slug), response: r.answer, correct: r.correct, errorTag: r.correct ? null : qq.errorTag ?? null };
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
        <div className={clsx("flex items-center gap-5", score / exercise.questions.length >= 0.8 && "anim-celebrate")}>
          <Ring value={score / exercise.questions.length} label="Score" size={84}><span className="text-sm font-bold">{Math.round((score / exercise.questions.length) * 100)}%</span></Ring>
          <div>
            <p className="eyebrow">Result</p>
            <p className="mt-1 font-display text-4xl font-extrabold">{score} / {exercise.questions.length}</p>
            <p className="text-sm text-muted">{score === exercise.questions.length ? "Excellent — every answer correct." : score / exercise.questions.length >= 0.8 ? "Strong result. Review the few you missed." : score / exercise.questions.length >= 0.5 ? "Good progress — a focused review will help." : "This topic needs more work. Start with the rule, then practise again."}</p>
          </div>
        </div>
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
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={restart} className="btn btn-ghost"><RotateCcw size={16} aria-hidden="true" /> Try again</button>
          {wrong.length > 0 && <Link href="/practice/smart?mode=mistakes" className="btn btn-primary"><Target size={16} aria-hidden="true" /> Practise my mistakes</Link>}
        </div>
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
        <div ref={feedbackRef} tabIndex={-1} role="status" data-testid="answer-feedback" className={clsx("mt-5 rounded-xl border px-4 py-3 outline-none", ok ? "border-success/50 anim-pop" : "border-danger/50 anim-shake")}>
          <p className={clsx("flex items-center gap-2 font-bold", ok ? "text-success" : "text-danger")}>
            {ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
            {ok ? "Correct" : "Not quite"}
          </p>
          {ok ? (
            <p className="mt-1.5 text-[15.5px] leading-relaxed"><Rich text={q.explanation} /></p>
          ) : (
            <dl className="mt-2 grid gap-2.5 text-[15.5px] leading-relaxed">
              <div><dt className="eyebrow">Your answer</dt><dd className="line-through decoration-danger/60">{shown(q, answer!)}</dd></div>
              <div><dt className="eyebrow">Correct answer</dt><dd className="font-semibold">{q.kind === "choice" ? q.options[q.answer] : q.accepted.join(" / ")}</dd></div>
              <div><dt className="eyebrow">Why it works</dt><dd><Rich text={q.explanation} /></dd></div>
              {rule && <div><dt className="eyebrow">Rule to remember</dt><dd data-testid="rule-summary"><Rich text={rule} /></dd></div>}
            </dl>
          )}
          {!ok && <ExplainMistake key={q.id} q={q} answer={answer!} exerciseSlug={exercise.slug} />}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {q.theoryAnchor && (
              <RuleLink lesson={q.theoryAnchor.lesson} section={q.theoryAnchor.section} className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                <BookOpen size={15} aria-hidden="true" /> Review the rule
              </RuleLink>
            )}
            {!ok && q.theoryAnchor && !exercise.slug.startsWith("smart-lesson") && (
              <Link href={`/practice/smart?lesson=${q.theoryAnchor.lesson}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                <Target size={15} aria-hidden="true" /> Practise this rule
              </Link>
            )}
          </div>
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
