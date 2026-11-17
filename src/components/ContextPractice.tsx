"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, XCircle, ArrowRight, Sparkles, Loader2, Shuffle } from "lucide-react";
import { useLearner } from "./StoreProvider";
import { useAiStatus } from "./useAiStatus";
import { LevelBadge, ProgressBar, Rich } from "./ui";
import { buildContextRound, normalise, usesItem, type ContextItem } from "@/lib/vocab-context";
import { getSense } from "@/lib/content";

const TITLE: Record<ContextItem["kind"], string> = {
  gap: "Gap filling", choice: "Multiple choice in context", form: "Sentence completion: the right form", meaning: "Meaning in context", produce: "Active production",
};
const INSTRUCTION: Record<ContextItem["kind"], string> = {
  gap: "Type the missing word or expression. The hint gives its first letter, length and meaning.",
  choice: "Choose the word that best fits the meaning and the context.",
  form: "Complete the sentence with the correct form of the word in brackets.",
  meaning: "What does the highlighted expression mean in this sentence?",
  produce: "Write your own sentence with this item. Show its meaning clearly, and use a natural collocation if you can.",
};
type Fb = { verdict: "natural" | "understandable" | "incorrect"; meaning: string; grammarAndCollocation: string; improved: string; tip: string };
type Result = { item: ContextItem; response: string; correct: boolean | null };

export function ContextPractice({ theme }: { theme: string }) {
  const { store, ready, saved } = useLearner();
  const ai = useAiStatus();
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / 1000));
  const studied = useMemo(() => saved.filter((s) => s.itemType === "sense").map((s) => s.itemRef), [saved]);
  const items = useMemo(() => (ready ? buildContextRound(theme, studied, seed) : []), [theme, seed, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [fb, setFb] = useState<{ busy: boolean; data?: Fb; error?: string }>({ busy: false });
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const startedAt = useRef(new Date().toISOString());
  const feedbackRef = useRef<HTMLDivElement>(null);

  const item = items[i];
  const ref = item ? getSense(item.senseId) : undefined;
  useEffect(() => { if (checked) feedbackRef.current?.focus({ preventScroll: false }); }, [checked]);

  function reset(next: number) { setI(next); setValue(""); setChoice(null); setChecked(false); setFb({ busy: false }); }
  function newRound() { setSeed((s) => s + 1); setResults([]); setSaveState("idle"); startedAt.current = new Date().toISOString(); reset(0); }

  const isCorrect = (it: ContextItem) => (it.options ? choice !== null && it.options[choice].correct : it.accepted.includes(normalise(value)));
  function check() {
    if (!item) return;
    if (item.kind === "produce") { if (!ref || !usesItem(ref, value)) return; setChecked(true); return; }
    setChecked(true);
    setResults((r) => [...r, { item, response: item.options ? item.options[choice!].text : value, correct: isCorrect(item) }]);
  }
  async function askAi() {
    setFb({ busy: true });
    try {
      const r = await fetch("/api/ai/vocab-sentence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senseId: item.senseId, sentence: value }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Feedback couldn't be loaded.");
      setFb({ busy: false, data: j.feedback });
    } catch (e) { setFb({ busy: false, error: (e as Error).message }); }
  }
  async function next() {
    const all = item.kind === "produce" ? [...results, { item, response: value, correct: fb.data ? fb.data.verdict !== "incorrect" : null }] : results;
    if (item.kind === "produce") setResults(all);
    if (i + 1 < items.length) { reset(i + 1); return; }
    reset(items.length);
    // Save the round: scored items count; the production task is recorded but only scored when AI checked it
    const scored = all.filter((r) => r.correct !== null);
    try {
      await store.saveAttempt(
        { exerciseSlug: `vocab-context-${theme}`, exerciseVersion: 1, score: scored.filter((r) => r.correct).length, total: scored.length, startedAt: startedAt.current },
        scored.map((r) => ({ questionId: r.item.id, targetRef: r.item.senseId, response: r.response, correct: !!r.correct, errorTag: r.correct ? null : `vocab-${r.item.kind}` })),
      );
      await store.logEvent({ type: "exercise_completed", contentType: "exercise", contentRef: `vocab-context-${theme}`, payload: { score: scored.filter((r) => r.correct).length, total: scored.length } });
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }

  if (!ready || items.length === 0) return <div className="skeleton h-72 rounded-2xl" aria-label="Loading" />;

  if (!item) {
    const scored = results.filter((r) => r.correct !== null);
    const score = scored.filter((r) => r.correct).length;
    return (
      <div className="card p-6" data-testid="context-summary">
        <p className="eyebrow">Round complete</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{score} / {scored.length}</p>
        <p className="text-sm text-muted">{saveState === "saved" ? "Saved to your progress." : saveState === "error" ? "Couldn't save this round. Your answers are shown below." : "Saving…"}</p>
        <ul className="mt-4 divide-y divide-line">
          {results.map((r) => (
            <li key={r.item.id} className="flex items-start gap-2 py-2 text-[15px]">
              {r.correct === null ? <Sparkles size={16} className="mt-1 text-muted" aria-hidden="true" /> : r.correct ? <CheckCircle2 size={16} className="mt-1 text-success" aria-hidden="true" /> : <XCircle size={16} className="mt-1 text-danger" aria-hidden="true" />}
              <span><span className="font-semibold">{r.item.lemma}</span> <span className="text-muted">· {TITLE[r.item.kind]}</span></span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={newRound}><Shuffle size={16} aria-hidden="true" /> New round</button>
          <Link href={`/vocabulary/topics/${theme}/practice`} className="btn btn-ghost">Flashcards</Link>
        </div>
      </div>
    );
  }

  const ok = checked && item.kind !== "produce" && isCorrect(item);
  const canCheck = item.options ? choice !== null : item.kind === "produce" ? !!ref && usesItem(ref, value) && value.trim().split(/\s+/).length >= 5 : value.trim().length > 0;
  return (
    <div className="mx-auto max-w-2xl" data-testid="context-practice">
      <div className="mb-4 flex items-center gap-3 text-sm text-muted">
        <span className="tabular-nums">{i + 1} / {items.length}</span>
        <div className="flex-1"><ProgressBar value={i / items.length} label="Round progress" /></div>
      </div>
      <div key={item.id} className="card reveal p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><span className="chip" data-testid="context-kind">{TITLE[item.kind]}</span><LevelBadge level={item.level as never} /></div>
        <p className="mt-2 text-sm text-muted">{INSTRUCTION[item.kind]}</p>

        {item.kind === "produce" ? (
          <>
            <p className="mt-4 font-display text-2xl font-extrabold">{item.lemma}</p>
            <p className="mt-1">{item.definition} <span lang="ru" className="text-primary">— {item.ru}</span></p>
            {item.collocations.length > 0 && <p className="mt-1 text-sm text-muted">Collocations: {item.collocations.join(" · ")}</p>}
            <label className="mt-4 block text-sm font-medium">Your sentence
              <textarea className="input mt-1 min-h-24" value={value} onChange={(e) => setValue(e.target.value)} disabled={checked} />
            </label>
            {value && ref && !usesItem(ref, value) && <p className="mt-1 text-xs text-muted">Include “{item.lemma}” (any form) in your sentence.</p>}
          </>
        ) : (
          <>
            <p className="mt-4 text-xl leading-relaxed" data-testid="context-sentence">
              {item.kind === "form" ? <><Rich text={item.sentence.replace("____", "______")} /> <span className="text-muted">({item.hint})</span></> : <Rich text={item.sentence.replace("____", "______")} />}
            </p>
            {item.options ? (
              <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Options">
                {item.options.map((o, n) => (
                  <label key={n} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                    checked && o.correct ? "border-success bg-[color-mix(in_srgb,var(--success)_10%,transparent)]" : checked && choice === n ? "border-danger" : choice === n ? "border-primary bg-primary-soft" : "border-line hover:border-primary")}>
                    <input type="radio" name="opt" className="mt-1" checked={choice === n} onChange={() => setChoice(n)} disabled={checked} />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <>
                <label className="mt-4 block text-sm font-medium">Your answer
                  <input className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)} disabled={checked} onKeyDown={(e) => { if (e.key === "Enter" && canCheck && !checked) check(); }} autoComplete="off" spellCheck={false} />
                </label>
                {item.kind === "gap" && <p className="mt-1 text-xs text-muted">Hint: {item.hint}</p>}
              </>
            )}
          </>
        )}

        {checked && (
          <div ref={feedbackRef} tabIndex={-1} role="status" data-testid="context-feedback" className={clsx("mt-5 rounded-xl border px-4 py-3 outline-none", item.kind === "produce" ? "border-line" : ok ? "border-success/50 anim-pop" : "border-danger/50 anim-shake")}>
            {item.kind !== "produce" ? (
              <>
                <p className={clsx("flex items-center gap-2 font-bold", ok ? "text-success" : "text-danger")}>{ok ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}{ok ? "Correct" : "Not quite"}</p>
                <dl className="mt-2 grid gap-2 text-[15px] leading-relaxed">
                  <div><dt className="eyebrow">Correct answer</dt><dd className="font-semibold">{item.kind === "meaning" ? item.options!.find((o) => o.correct)!.text : item.answer}</dd></div>
                  <div><dt className="eyebrow">Explanation</dt><dd>“{item.lemma}”: {item.definition} <span lang="ru" className="text-primary">— {item.ru}</span></dd></div>
                  <div><dt className="eyebrow">Why it fits here</dt><dd><Rich text={item.fit} /></dd></div>
                  {item.options && <div><dt className="eyebrow">Why the other options don't fit</dt><dd><ul className="mt-1 space-y-1">{item.options.filter((o) => !o.correct).map((o) => <li key={o.text} className="text-muted">{o.why}</li>)}</ul></dd></div>}
                  {item.example.startsWith("Common combinations: ") ? <div><dt className="eyebrow">Natural combinations</dt><dd className="italic">{item.example.slice(21)}</dd></div>
                    : <div><dt className="eyebrow">Another example</dt><dd className="italic">{item.example}</dd></div>}
                </dl>
              </>
            ) : fb.data ? (
              <div className="space-y-2 text-[15px]" data-testid="sentence-feedback">
                <p className={clsx("font-bold", fb.data.verdict === "natural" ? "text-success" : fb.data.verdict === "understandable" ? "text-accent-text" : "text-danger")}>{fb.data.verdict === "natural" ? "Natural and correct" : fb.data.verdict === "understandable" ? "Correct meaning, could be more natural" : "Not quite right yet"}</p>
                <p><strong>Meaning:</strong> {fb.data.meaning}</p>
                <p><strong>Grammar and collocation:</strong> {fb.data.grammarAndCollocation}</p>
                <p><strong>A natural version:</strong> <em>{fb.data.improved}</em></p>
                <p className="text-muted"><strong>Tip:</strong> {fb.data.tip}</p>
                <p className="text-xs text-muted">AI-generated feedback.</p>
              </div>
            ) : (
              <div className="space-y-2 text-[15px]">
                <p className="font-bold">Check your sentence</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Does it show the meaning “{item.definition}”?</li>
                  {item.collocations[0] && <li>Is it used in a natural combination, for example <em>{item.collocations[0]}</em>?</li>}
                  <li>Is the form right for the grammar of your sentence?</li>
                </ul>
                <p><strong>Model sentence:</strong> <em>{ref?.sense.examples[0]}</em></p>
                {ai?.enabled ? (
                  <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" onClick={askAi} disabled={fb.busy}>
                    {fb.busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} Get AI feedback on my sentence
                  </button>
                ) : <p className="text-xs text-muted">AI feedback isn't available on this copy of the app; compare with the model sentence.</p>}
                {fb.error && <p role="alert" className="text-sm text-danger">{fb.error}</p>}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!checked ? <button className="btn btn-primary" disabled={!canCheck} onClick={check}>{item.kind === "produce" ? "Check my sentence" : "Check"}</button>
            : <button className="btn btn-primary" onClick={next}>{i + 1 < items.length ? "Next" : "See result"} <ArrowRight size={16} aria-hidden="true" /></button>}
        </div>
      </div>
    </div>
  );
}
