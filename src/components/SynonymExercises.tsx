"use client";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { ProgressBar, Rich } from "./ui";
import { TYPE_LABEL, type SynExercise } from "@/lib/synonyms";

/** Contextual synonym exercises: choose, then see why each option is right or wrong. */
export function SynonymExercises({ exercises, slug }: { exercises: SynExercise[]; slug: string }) {
  const { store } = useLearner();
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<{ id: string; group: string; choice: number; correct: boolean }[]>([]);
  const [saved, setSaved] = useState<"idle" | "saved" | "error">("idle");
  const startedAt = useRef(new Date().toISOString());
  const ex = exercises[i];
  const score = useMemo(() => results.filter((r) => r.correct).length, [results]);

  function check() { if (choice === null) return; setChecked(true); setResults((r) => [...r, { id: ex.id, group: ex.group, choice, correct: choice === ex.answer }]); }
  async function next() {
    if (i + 1 < exercises.length) { setI(i + 1); setChoice(null); setChecked(false); return; }
    setI(exercises.length);
    try {
      await store.saveAttempt({ exerciseSlug: slug, exerciseVersion: 1, score: results.filter((r) => r.correct).length, total: results.length, startedAt: startedAt.current },
        results.map((r) => ({ questionId: r.id, targetRef: `syn:${r.group}`, response: r.choice, correct: r.correct, errorTag: r.correct ? null : "synonym-choice" })));
      await store.logEvent({ type: "exercise_completed", contentType: "exercise", contentRef: slug, payload: { score: results.filter((r) => r.correct).length, total: results.length } });
      setSaved("saved");
    } catch { setSaved("error"); }
  }
  function restart() { setI(0); setChoice(null); setChecked(false); setResults([]); setSaved("idle"); startedAt.current = new Date().toISOString(); }

  if (!ex) {
    return (
      <div className="card p-6" data-testid="synonym-summary">
        <p className="eyebrow">Result</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{score} / {results.length}</p>
        <p className="text-sm text-muted">{saved === "saved" ? "Saved to your progress." : saved === "error" ? "Couldn't save this result." : "Saving…"}</p>
        <button className="btn btn-ghost mt-4" onClick={restart}><RotateCcw size={16} aria-hidden="true" /> Try again</button>
      </div>
    );
  }
  const ok = checked && choice === ex.answer;
  return (
    <div className="card p-6 sm:p-8" data-testid="synonym-exercise">
      <div className="mb-4 flex items-center gap-3 text-sm text-muted">
        <span className="tabular-nums">{i + 1} / {exercises.length}</span>
        <div className="flex-1"><ProgressBar value={i / exercises.length} label="Progress" /></div>
      </div>
      <div key={ex.id} className="reveal">
        <span className="chip">{TYPE_LABEL[ex.type]}</span>
        <p className="mt-3 text-xl leading-relaxed" data-testid="synonym-sentence"><Rich text={ex.sentence.replace("____", "______")} /></p>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Options">
          {ex.options.map((o, n) => (
            <label key={o} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
              checked && n === ex.answer ? "border-success bg-[color-mix(in_srgb,var(--success)_10%,transparent)]" : checked && choice === n ? "border-danger" : choice === n ? "border-primary bg-primary-soft" : "border-line hover:border-primary")}>
              <input type="radio" name={`syn-${ex.id}`} className="mt-1" checked={choice === n} onChange={() => setChoice(n)} disabled={checked} />
              <span><Rich text={o} /></span>
            </label>
          ))}
        </div>
        {checked && (
          <div role="status" data-testid="synonym-feedback" className={clsx("mt-5 rounded-xl border px-4 py-3", ok ? "border-success/50 anim-pop" : "border-danger/50 anim-shake")}>
            <p className={clsx("flex items-center gap-2 font-bold", ok ? "text-success" : "text-danger")}>{ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}{ok ? "Correct" : "Not quite"}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed"><Rich text={ex.explanation} /></p>
            <ul className="mt-3 space-y-1.5 text-[15px]" aria-label="Each option explained">
              {ex.options.map((o, n) => (
                <li key={o} className={clsx("rounded-lg px-3 py-1.5", n === ex.answer ? "bg-[color-mix(in_srgb,var(--success)_10%,transparent)]" : "bg-surface-2")}>
                  <span className="font-semibold"><Rich text={o} />: </span><Rich text={ex.optionNotes[n].replace(/^Correct[^:]*:\s*/, "")} />
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[15px]"><span className="font-semibold">In other contexts: </span><Rich text={ex.interchangeable} /></p>
            <div className="mt-2 text-[15px]"><span className="font-semibold">More examples:</span>
              <ul className="mt-1 list-disc pl-5 italic text-muted">{ex.examples.map((x) => <li key={x}><Rich text={x} /></li>)}</ul>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          {!checked ? <button className="btn btn-primary" disabled={choice === null} onClick={check}>Check</button>
            : <button className="btn btn-primary" onClick={next}>{i + 1 < exercises.length ? "Next" : "See result"} <ArrowRight size={16} aria-hidden="true" /></button>}
        </div>
      </div>
    </div>
  );
}
