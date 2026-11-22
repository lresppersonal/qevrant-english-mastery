"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, X, Eye, RotateCcw, Shuffle, ArrowRight, BookOpen, PenLine, Mic, Lightbulb, CircleAlert, Save } from "lucide-react";
import type { GrammarLesson } from "@/lib/content/schema";
import { getExercise, rulesFor } from "@/lib/content";
import { buildSmartSet, mistakeQueue, questionPool } from "@/lib/learning";
import { withNavContext, type NavContext } from "@/lib/nav-context";
import { useLearner } from "../StoreProvider";
import { useLearnerData } from "../useLearnerData";
import { ExercisePlayer } from "../ExercisePlayer";
import { Rich } from "../ui";

/* ---------- helpers ---------- */

/** Render a sentence whose target form is marked [[like this]]; highlight only when `show` is true. */
function Marked({ text, show }: { text: string; show: boolean }) {
  const parts = text.split(/(\[\[.+?\]\])/g);
  return <>{parts.map((p, i) => p.startsWith("[[")
    ? (show ? <mark key={i} className="rounded bg-primary-soft px-0.5 font-semibold text-primary">{p.slice(2, -2)}</mark> : <span key={i}>{p.slice(2, -2)}</span>)
    : <Rich key={i} text={p} />)}</>;
}

/** Draft text kept for this tab, so switching stages never loses what the learner typed. */
function useDraft(key: string, initial = "") {
  const [v, setV] = useState(initial);
  useEffect(() => { try { const s = sessionStorage.getItem(key); if (s !== null) setV(s); } catch { /* storage unavailable */ } }, [key]);
  const set = (x: string) => { setV(x); try { sessionStorage.setItem(key, x); } catch { /* storage unavailable */ } };
  return [v, set] as const;
}

/* ---------- Recognise ---------- */
const REC_LABEL = { hit: "✓ Correct.", missed: "Missed.", wrong: "✗ Not this structure.", ok: "✓ Correctly left unselected." } as const;

export function RecogniseStage({ lesson, readings, linkCtx, onNext }: { lesson: GrammarLesson; readings: { slug: string; title: string }[]; linkCtx: NavContext; onNext: () => void }) {
  const { store } = useLearner();
  const rec = lesson.recognise;
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const started = useRef(new Date().toISOString());
  if (!rec) return <p className="text-muted">A recognition passage for this topic is being prepared. Meanwhile, continue with Practise.</p>;
  const right = rec.sentences.filter((s, i) => s.has === picked.has(i)).length;
  const toggle = (i: number) => { if (checked) return; const n = new Set(picked); if (n.has(i)) n.delete(i); else n.add(i); setPicked(n); };
  const check = async () => {
    setChecked(true);
    try {
      await store.saveAttempt(
        { exerciseSlug: `grammar-recognise-${lesson.slug}`, exerciseVersion: 1, score: right, total: rec.sentences.length, startedAt: started.current },
        rec.sentences.map((s, i) => ({ questionId: `s${i + 1}`, targetRef: null, response: picked.has(i), correct: s.has === picked.has(i), errorTag: s.has === picked.has(i) ? null : `${lesson.slug}:recognise` })),
      );
      await store.logEvent({ type: "exercise_completed", contentType: "grammar_recognise", contentRef: lesson.slug, payload: { score: right, total: rec.sentences.length } });
    } catch (e) { setSaveError((e as Error).message); }
  };
  const reset = () => { setPicked(new Set()); setChecked(false); started.current = new Date().toISOString(); };
  return (
    <div className="space-y-5" data-testid="recognise-stage">
      <div>
        <h2 className="text-2xl font-extrabold">Spot it in context</h2>
        <p className="mt-1 text-muted">Read the passage and select every sentence that uses the structure from this lesson. Then check: each form is highlighted with a short note on why it is used.</p>
      </div>
      <section className="card p-5 sm:p-7" aria-labelledby="rec-title">
        <h3 id="rec-title" className="mb-4 font-display text-lg font-bold">{rec.title}</h3>
        <ol className="space-y-2">
          {rec.sentences.map((s, i) => {
            const on = picked.has(i);
            const state = !checked ? null : s.has && on ? "hit" : s.has ? "missed" : on ? "wrong" : "ok";
            return (
              <li key={i}>
                <button type="button" onClick={() => toggle(i)} aria-pressed={on} disabled={checked}
                  className={clsx("w-full rounded-xl border px-4 py-3 text-left text-[16.5px] leading-relaxed transition-[background,border-color,box-shadow] duration-200",
                    !checked && (on ? "border-primary bg-primary-soft shadow-[inset_3px_0_0_var(--primary)]" : "border-line bg-surface hover:border-primary/50"),
                    state === "hit" && "border-success/60 bg-[color-mix(in_srgb,var(--success)_8%,var(--surface))]",
                    state === "missed" && "border-accent/70 bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]",
                    state === "wrong" && "border-danger/60 bg-[color-mix(in_srgb,var(--danger)_6%,var(--surface))]",
                    state === "ok" && "border-line bg-surface opacity-80")}>
                  <span className="flex gap-3">
                    <span className={clsx("mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-fg" : "border-line")} aria-hidden="true">{on && <Check size={13} />}</span>
                    <span className="min-w-0 flex-1">
                      <Marked text={s.text} show={checked && s.has} />
                      {checked && state && <span className="mt-1.5 block text-[14.5px]">
                        <span className="mr-1.5 font-semibold">{REC_LABEL[state]}</span>
                        <span className="text-muted">{state === "hit" || state === "missed"
                          ? (s.note ?? `This sentence uses the structure from “${lesson.title}”.`) + (state === "missed" ? " Look for this form and its signal words when you reread." : "")
                          : state === "wrong" ? (s.note ?? "It looks similar, but it does not use this structure: compare its form with Part C (Formation) and Part E (Comparison).")
                          : null}</span>
                      </span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!checked ? <button type="button" className="btn btn-primary" onClick={check} disabled={picked.size === 0}>Check my choices</button>
            : <>
              <p className="anim-pop font-semibold" role="status" data-testid="recognise-result">{right} of {rec.sentences.length} sentences identified correctly</p>
              <p className="w-full text-sm text-muted">{right === rec.sentences.length ? "You recognise the form reliably. Practise will now ask you to choose and produce it." : "Read the note under each marked sentence. Mistakes here usually mean confusing this form with a similar one; Part E of the theory compares them."}</p>
              <button type="button" className="btn btn-ghost" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Try again</button>
              <button type="button" className="btn btn-primary" onClick={onNext}>Next: Practise <ArrowRight size={16} aria-hidden="true" /></button>
            </>}
          {saveError && <p role="alert" className="text-sm text-danger">Your result couldn&apos;t be saved: {saveError}</p>}
        </div>
      </section>
      {readings.length > 0 && (
        <section className="card p-5" aria-labelledby="rec-more">
          <h3 id="rec-more" className="font-bold">See it in a longer text</h3>
          <ul className="mt-2 space-y-1">
            {readings.map((r) => <li key={r.slug}><Link href={withNavContext(`/reading/${r.slug}`, linkCtx)} className="inline-flex items-center gap-1.5 py-1.5 font-medium text-primary underline-offset-4 hover:underline"><BookOpen size={15} aria-hidden="true" /> {r.title}</Link></li>)}
          </ul>
          <p className="mt-1 text-sm text-muted">The back link on the text returns you to this stage.</p>
        </section>
      )}
    </div>
  );
}

/* ---------- Quick understanding check (end of the theory) ---------- */

export function QuickCheck({ lesson }: { lesson: GrammarLesson }) {
  const { store } = useLearner();
  const items = lesson.check;
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const saved = useRef(false);
  const started = useRef(new Date().toISOString());
  const choices = items.filter((x) => x.kind === "choice");
  const answered = choices.filter((x) => x.id in chosen).length;
  const correct = choices.filter((x) => x.kind === "choice" && chosen[x.id] === x.answer).length;
  const complete = items.every((x) => (x.kind === "choice" ? x.id in chosen : shown[x.id]));
  useEffect(() => {
    if (!complete || saved.current || !choices.length) return;
    saved.current = true;
    store.saveAttempt(
      { exerciseSlug: `grammar-check-${lesson.slug}`, exerciseVersion: 1, score: correct, total: choices.length, startedAt: started.current },
      choices.map((x) => ({ questionId: x.id, targetRef: null, response: chosen[x.id], correct: x.kind === "choice" && chosen[x.id] === x.answer, errorTag: null })),
    ).then(() => store.logEvent({ type: "exercise_completed", contentType: "grammar_check", contentRef: lesson.slug, payload: { score: correct, total: choices.length } })).catch(() => { saved.current = false; });
  }, [complete, choices, chosen, correct, lesson.slug, store]);
  if (!items.length) return null;
  return (
    <section className="card p-5 sm:p-7" aria-labelledby="h-check" data-testid="quick-check">
      <h3 id="h-check" className="flex items-center gap-2 text-xl font-bold"><Lightbulb size={20} className="text-primary" aria-hidden="true" /> Quick understanding check</h3>
      <p className="mt-1 text-muted">Answer from memory before you look back. This is for you: it is not a test.</p>
      <ol className="mt-5 space-y-6">
        {items.map((x, n) => (
          <li key={x.id} className="space-y-3">
            <p className="font-semibold"><span className="mr-2 text-primary">{n + 1}.</span><Rich text={x.prompt} /></p>
            {x.kind === "choice" ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label={`Options for question ${n + 1}`}>
                  {x.options.map((o, k) => {
                    const pick = chosen[x.id];
                    const done = pick !== undefined;
                    return (
                      <button key={k} type="button" disabled={done} onClick={() => setChosen({ ...chosen, [x.id]: k })}
                        className={clsx("rounded-xl border px-4 py-2.5 text-left transition-colors duration-200",
                          !done && "border-line hover:border-primary/60 hover:bg-surface-2",
                          done && k === x.answer && "border-success/60 bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]",
                          done && k === pick && k !== x.answer && "border-danger/60 bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))]",
                          done && k !== pick && k !== x.answer && "border-line opacity-70")}>
                        <span className="flex items-start gap-2">{done && k === x.answer && <Check size={16} className="mt-1 shrink-0 text-success" aria-label="Correct answer" />}{done && k === pick && k !== x.answer && <X size={16} className="mt-1 shrink-0 text-danger" aria-label="Your answer" />}<Rich text={o} /></span>
                      </button>
                    );
                  })}
                </div>
                {chosen[x.id] !== undefined && <p className="fade-up rounded-xl bg-surface-2 px-4 py-3 text-[15px]" role="status"><strong>{chosen[x.id] === x.answer ? "Yes. " : "Not quite. "}</strong><Rich text={x.explanation} /></p>}
              </>
            ) : (
              <>
                <label className="sr-only" htmlFor={`chk-${x.id}`}>Your explanation</label>
                <textarea id={`chk-${x.id}`} className="input min-h-20" placeholder="Explain it in your own words (optional)…" value={notes[x.id] ?? ""} onChange={(e) => setNotes({ ...notes, [x.id]: e.target.value })} />
                {!shown[x.id] ? <button type="button" className="btn btn-ghost" onClick={() => setShown({ ...shown, [x.id]: true })}><Eye size={15} aria-hidden="true" /> Show a model answer</button>
                  : <div className="fade-up rounded-xl bg-surface-2 px-4 py-3 text-[15px]"><p><strong>Model answer: </strong><Rich text={x.model} /></p><p className="mt-1 text-muted"><Rich text={x.explanation} /></p></div>}
              </>
            )}
          </li>
        ))}
      </ol>
      {complete && choices.length > 0 && <p className="anim-pop mt-6 font-semibold" role="status" data-testid="check-result">{correct} of {answered} correct{correct === answered ? ". Well done: you're ready to recognise it in context." : ". Look back at the parts you missed, then move on."}</p>}
    </section>
  );
}

/* ---------- Practise ---------- */

export function PractiseStage({ lesson, onTheory }: { lesson: GrammarLesson; onTheory: () => void }) {
  const exercises = lesson.exercises.map((s) => getExercise(s)).filter((e): e is NonNullable<typeof e> => !!e);
  const rules = useMemo(() => rulesFor(exercises), [exercises]);
  if (!exercises.length) return <p className="text-muted">There are no practice questions for this topic yet.</p>;
  return (
    <div className="space-y-6" data-testid="practise-stage">
      <div>
        <h2 className="text-2xl font-extrabold">Practise</h2>
        <p className="mt-1 text-muted">Controlled practice from B2 to C2. Every explanation quotes the rule it practises. <button type="button" onClick={onTheory} className="font-semibold text-primary underline-offset-4 hover:underline">Revise the theory</button></p>
      </div>
      {exercises.map((ex) => (
        <section key={ex.slug} aria-label={ex.title}>
          <p className="mb-4 text-muted">{ex.instructions}</p>
          <ExercisePlayer exercise={ex} rules={rules} />
        </section>
      ))}
    </div>
  );
}

/* ---------- Produce ---------- */

export function ProduceStage({ lesson, tasks, linkCtx, onNext }: { lesson: GrammarLesson; tasks: { href: string; title: string; kind: "writing" | "speaking" }[]; linkCtx: NavContext; onNext: () => void }) {
  const { store } = useLearner();
  const { data, reload } = useLearnerData();
  const p = lesson.produce;
  const [text, setText] = useDraft(`qevrant.produce.${lesson.slug}`);
  const [ticks, setTicks] = useState<Set<number>>(new Set());
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const prior = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.attempts.filter((a) => a.exerciseSlug === `grammar-produce-${lesson.slug}`).map((a) => a.id));
    return data.responses.filter((r) => ids.has(r.attemptId)).map((r) => ({ at: r.createdAt, text: String((r.response as { text?: string })?.text ?? "") })).filter((x) => x.text).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  }, [data, lesson.slug]);
  if (!p) return <p className="text-muted">A production task for this topic is being prepared.</p>;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const save = async () => {
    setState("saving"); setErr(null);
    try {
      const now = new Date().toISOString();
      await store.saveAttempt(
        { exerciseSlug: `grammar-produce-${lesson.slug}`, exerciseVersion: 1, score: ticks.size, total: p.checklist.length, startedAt: now },
        [{ questionId: "produce", targetRef: null, response: { text: text.trim(), checklist: [...ticks] }, correct: ticks.size === p.checklist.length, errorTag: null }],
      );
      await store.logEvent({ type: "exercise_completed", contentType: "grammar_produce", contentRef: lesson.slug, payload: { words } });
      setState("saved");
      reload();
    } catch (e) { setState("error"); setErr((e as Error).message); }
  };
  return (
    <div className="space-y-5" data-testid="produce-stage">
      <div>
        <h2 className="text-2xl font-extrabold">Produce</h2>
        <p className="mt-1 text-muted">Now use the structure yourself. Write first, then check your own text against the list.</p>
      </div>
      <section className="card space-y-4 p-5 sm:p-7">
        <p className="text-[16.5px] font-medium"><Rich text={p.prompt} /></p>
        <div>
          <label htmlFor="produce-text" className="text-sm font-semibold">Your text</label>
          <textarea id="produce-text" className="input mt-1 min-h-40 text-[16px] leading-relaxed" value={text} onChange={(e) => { setText(e.target.value); if (state === "saved") setState("idle"); }} />
          <p className="mt-1 text-xs text-muted">{words} words · your draft is kept while you move between stages</p>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Check your text</legend>
          <ul className="mt-2 space-y-1.5">
            {p.checklist.map((c, i) => (
              <li key={i}><label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-2">
                <input type="checkbox" className="mt-1.5 h-4 w-4 accent-[var(--primary)]" checked={ticks.has(i)} onChange={() => { const n = new Set(ticks); if (n.has(i)) n.delete(i); else n.add(i); setTicks(n); }} />
                <span><Rich text={c} /></span>
              </label></li>
            ))}
          </ul>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={words < 5 || state === "saving"} onClick={save}><Save size={16} aria-hidden="true" /> {state === "saving" ? "Saving…" : "Save my text"}</button>
          {state === "saved" && <><p className="anim-pop font-semibold text-success" role="status" data-testid="produce-saved"><Check size={16} className="mr-1 inline" aria-hidden="true" />Saved to your progress</p>
            <button type="button" className="btn btn-ghost" onClick={onNext}>Next: Feedback <ArrowRight size={16} aria-hidden="true" /></button></>}
          {state === "error" && <p role="alert" className="text-sm text-danger">Your text couldn&apos;t be saved: {err}</p>}
        </div>
      </section>
      {prior.length > 0 && (
        <section className="card p-5">
          <h3 className="font-bold">Your earlier texts</h3>
          <ul className="mt-2 space-y-2">{prior.map((x) => <li key={x.at} className="rounded-xl bg-surface-2 px-4 py-2.5 text-[15px]"><span className="block text-xs text-muted">{new Date(x.at).toLocaleDateString()}</span>{x.text}</li>)}</ul>
        </section>
      )}
      {tasks.length > 0 && (
        <section className="card p-5">
          <h3 className="font-bold">Use it in a longer task, with AI feedback</h3>
          <p className="mt-1 text-sm text-muted">Essay and speaking feedback marks this grammar point when it finds it in your work; it then appears under Feedback here. Back on those pages returns you to this stage.</p>
          <ul className="mt-2 space-y-1">
            {tasks.map((t) => <li key={t.href}><Link href={withNavContext(t.href, linkCtx)} className="inline-flex items-center gap-1.5 py-1.5 font-medium text-primary underline-offset-4 hover:underline">{t.kind === "writing" ? <PenLine size={15} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />} {t.title}</Link></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------- Feedback ---------- */

type AnyIssue = { quote: string; problem: string; suggestion: string; grammarRef?: string | null };

export function FeedbackStage({ lesson, onReview, onUnderstand }: { lesson: GrammarLesson; onReview: () => void; onUnderstand: (section?: string) => void }) {
  const { data, error } = useLearnerData();
  const mistakes = useMemo(() => {
    if (!data) return [];
    const pool = questionPool();
    const last = new Map<string, unknown>();
    const slugOf = new Map(data.attempts.map((a) => [a.id, a.exerciseSlug]));
    for (const r of data.responses) last.set(r.questionId.includes("/") ? r.questionId : `${slugOf.get(r.attemptId)}/${r.questionId}`, r.response);
    return mistakeQueue(data.responses, data.attempts).map((m) => ({ ...m, item: pool.get(m.id)!, yours: last.get(m.id) })).filter((m) => m.item?.lesson === lesson.slug).slice(0, 8);
  }, [data, lesson.slug]);
  const issues = useMemo(() => {
    if (!data) return [];
    return [...data.writing.map((w) => ({ kind: "Essay", at: w.createdAt, fb: w.feedback })), ...data.speaking.map((s) => ({ kind: "Speaking answer", at: s.createdAt, fb: s.feedback }))]
      .flatMap((x) => (((x.fb as { issues?: AnyIssue[] } | null)?.issues) ?? []).filter((i) => i.grammarRef?.startsWith(`lesson:${lesson.slug}`)).map((i) => ({ ...i, kind: x.kind, at: x.at })))
      .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  }, [data, lesson.slug]);
  const lastScore = (slug: string) => {
    const a = data?.attempts.filter((x) => x.exerciseSlug === slug).sort((x, y) => y.completedAt.localeCompare(x.completedAt))[0];
    return a ? `${a.score} of ${a.total}` : null;
  };
  if (error) return <p role="alert" className="text-danger">Your progress couldn&apos;t be loaded: {error}</p>;
  if (!data) return <div className="skeleton h-48 rounded-2xl" aria-label="Loading" />;
  const answer = (it: (typeof mistakes)[number]["item"]) => it.question.kind === "choice" ? it.question.options[it.question.answer] : it.question.accepted[0];
  const yours = (m: (typeof mistakes)[number]) => (m.item.question.kind === "choice" && typeof m.yours === "number" ? m.item.question.options[m.yours] : typeof m.yours === "string" ? m.yours : "—");
  const check = lastScore(`grammar-check-${lesson.slug}`), rec = lastScore(`grammar-recognise-${lesson.slug}`);
  return (
    <div className="space-y-5" data-testid="feedback-stage">
      <div>
        <h2 className="text-2xl font-extrabold">Feedback</h2>
        <p className="mt-1 text-muted">Everything you have done on this topic that is worth learning from, in one place: your own answers, and corrections from your essays and speaking.</p>
      </div>
      {(check || rec) && <p className="flex flex-wrap gap-2 text-sm">{check && <span className="chip">Quick check: {check}</span>}{rec && <span className="chip">Recognise: {rec}</span>}</p>}
      <section className="card p-5 sm:p-7" aria-labelledby="fb-answers">
        <h3 id="fb-answers" className="text-xl font-bold">Answers to learn from <span className="text-base font-medium text-muted">({mistakes.length})</span></h3>
        {mistakes.length === 0 ? <p className="mt-2 text-muted">No wrong answers waiting on this topic. {data.responses.length ? "Answers you get wrong in Practise appear here with their explanation." : "Start with Practise; any answer you get wrong will appear here with its explanation."}</p> : (
          <ul className="mt-4 space-y-4">
            {mistakes.map((m) => (
              <li key={m.id} className="rounded-xl border border-line p-4">
                <p className="font-medium"><Rich text={m.item.question.prompt} /></p>
                <p className="mt-2 grid gap-1 text-[15px] sm:grid-cols-2">
                  <span><span className="text-xs font-semibold uppercase tracking-wide text-danger">Your answer</span><br /><Rich text={String(yours(m))} /></span>
                  <span><span className="text-xs font-semibold uppercase tracking-wide text-success">Correct</span><br /><Rich text={answer(m.item)} /></span>
                </p>
                <p className="mt-2 text-[15px] text-muted"><Rich text={m.item.question.explanation} /></p>
                {m.item.question.theoryAnchor && <button type="button" onClick={() => onUnderstand(m.item.question.theoryAnchor!.section)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"><BookOpen size={14} aria-hidden="true" /> Review the rule</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card p-5 sm:p-7" aria-labelledby="fb-work">
        <h3 id="fb-work" className="text-xl font-bold">From your essays and speaking <span className="text-base font-medium text-muted">({issues.length})</span></h3>
        {issues.length === 0 ? <p className="mt-2 text-muted">AI feedback on your essays and speaking answers has not flagged this grammar point. When it does, the sentence and the correction appear here.</p> : (
          <ul className="mt-4 space-y-3">
            {issues.map((i, n) => (
              <li key={n} className="rounded-xl border border-line p-4">
                <p className="text-xs text-muted">{i.kind} · {new Date(i.at).toLocaleDateString()}</p>
                <p className="mt-1"><s className="decoration-danger/70">{i.quote}</s> → <strong>{i.suggestion}</strong></p>
                <p className="mt-1 text-[15px] text-muted">{i.problem}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {mistakes.length > 0 && <button type="button" className="btn btn-primary" onClick={onReview}><CircleAlert size={16} aria-hidden="true" /> Retry these in Review</button>}
    </div>
  );
}

/* ---------- Review ---------- */

export function ReviewStage({ lesson }: { lesson: GrammarLesson }) {
  const { data, error } = useLearnerData();
  const [seed, setSeed] = useState(() => Date.now());
  const set = useMemo(() => (data ? buildSmartSet({ responses: data.responses, attempts: data.attempts }, "lesson", { lesson: lesson.slug, seed, size: 10 }) : null), [data, lesson.slug, seed]);
  return (
    <div className="space-y-5" data-testid="review-stage">
      <div>
        <h2 className="text-2xl font-extrabold">Review</h2>
        <p className="mt-1 text-muted">A fresh set built from your own answers on this topic: questions you got wrong come back until you answer them correctly, mixed with ones you have not seen for a while.</p>
      </div>
      {error ? <p role="alert" className="text-danger">Your progress couldn&apos;t be loaded: {error}</p>
        : !data ? <div className="skeleton h-64 rounded-2xl" aria-label="Loading" />
        : !set ? <div className="card p-6"><p className="font-semibold">Not enough questions for a review set yet.</p><p className="mt-1 text-muted">Answer some questions in Practise first.</p></div>
        : <>
          <ExercisePlayer key={`${set.exercise.slug}-${seed}`} exercise={set.exercise} rules={rulesFor([set.exercise])} />
          <button type="button" className="btn btn-ghost" onClick={() => setSeed(Date.now())}><Shuffle size={16} aria-hidden="true" /> New set</button>
        </>}
    </div>
  );
}
