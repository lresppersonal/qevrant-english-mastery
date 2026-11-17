"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, History } from "lucide-react";
import type { WritingPrompt } from "@/lib/content/schema";
import { getSense, getEssayGuide, getTheme } from "@/lib/content";
import { ESSAY_LABEL } from "@/lib/essay";
import { countWords, WritingFeedbackView } from "@/lib/ai/schemas";
import type { WritingSubmission } from "@/lib/store/types";
import { useLearner } from "./StoreProvider";
import { useAiStatus } from "./useAiStatus";
import { FeedbackView } from "./FeedbackView";
import { LevelBadge } from "./ui";

export function EssayWorkspace({ prompt }: { prompt: WritingPrompt }) {
  const { store, ready } = useLearner();
  const ai = useAiStatus();
  const draftKey = `qevrant.draft.writing.${prompt.slug}`;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WritingSubmission[]>([]);
  const [current, setCurrent] = useState<WritingSubmission | null>(null);
  const started = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const words = countWords(body);

  useEffect(() => { try { setBody(localStorage.getItem(draftKey) ?? ""); } catch {} }, [draftKey]);
  useEffect(() => { try { localStorage.setItem(draftKey, body); } catch {} }, [draftKey, body]);
  useEffect(() => {
    if (!ready) return;
    store.setLastPosition({ href: `/writing/${prompt.slug}`, label: `Essay: ${prompt.title}` }).catch(() => {});
    store.listWriting().then((all) => setHistory(all.filter((w) => w.promptSlug === prompt.slug))).catch(() => {});
  }, [ready, store, prompt]);

  async function submit() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/ai/writing", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptSlug: prompt.slug, body, secondsSpent: started.current ? Math.round((Date.now() - started.current) / 1000) : null }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Request failed");
      let sub: WritingSubmission = json.submission;
      if (!json.persisted && store.addWritingLocal) {
        sub = await store.addWritingLocal({ promptSlug: sub.promptSlug, body: sub.body, wordCount: sub.wordCount, secondsSpent: sub.secondsSpent, feedback: sub.feedback });
        await store.logEvent({ type: "writing_submitted", contentType: "writing", contentRef: prompt.slug, payload: { words: sub.wordCount } });
      }
      setCurrent(sub);
      setHistory((h) => [sub, ...h]);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const parsed = current ? WritingFeedbackView.safeParse(current.feedback) : null;

  return (
    <article>
      <Link href="/writing" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic Writing</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><LevelBadge level={prompt.level} /><span className="chip">{ESSAY_LABEL[prompt.genre]}</span>{prompt.topics.map((t) => <span key={t} className="chip">{getTheme(t)?.title ?? t}</span>)}<span className="chip">{prompt.minWords}+ words</span><span className="chip">about {prompt.suggestedMinutes} min</span></div>
          <h1 className="text-3xl font-extrabold">{prompt.title}</h1>
          <blockquote className="card mt-4 border-l-4 !border-l-primary p-5 text-[17px] font-medium leading-relaxed">{prompt.prompt}</blockquote>

          <label htmlFor="essay" className="mt-6 block font-semibold">Your essay</label>
          <textarea id="essay" value={body} onChange={(e) => { if (!started.current) started.current = Date.now(); setBody(e.target.value); }}
            rows={18} spellCheck={false} placeholder="Start writing here. Your draft is saved automatically on this device."
            className="input mt-2 resize-y font-[450] text-[16.5px] leading-[1.8]" aria-describedby="wc" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p id="wc" className={words >= prompt.minWords ? "text-sm font-semibold text-success" : "text-sm text-muted"} aria-live="polite">
              {words} words{words < prompt.minWords ? ` · ${prompt.minWords - words} to go` : " · length OK"}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={submit} disabled={busy || !ai?.enabled || words < 80} className="btn btn-primary">
                {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Analysing… (about 20 s)</> : <><Sparkles size={16} aria-hidden="true" /> Get AI feedback</>}
              </button>
            </div>
          </div>
          {ai && !ai.enabled && <p className="mt-2 text-sm text-muted">{ai.reason}</p>}
          {ai?.enabled && words < 80 && <p className="mt-2 text-sm text-muted">Feedback unlocks at 80 words.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </div>

        <aside className="space-y-4">
          {prompt.plan.length > 0 && (
            <div className="card p-5">
              <p className="font-bold">Suggested plan</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px]">{prompt.plan.map((g) => <li key={g}>{g}</li>)}</ol>
            </div>
          )}
          <div className="card p-5">
            <p className="font-bold">Before you write</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] text-muted">{prompt.guidance.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
          {(prompt.usefulLanguage.length > 0 || prompt.vocabulary.length > 0) && (
            <div className="card p-5">
              <p className="font-bold">Advanced vocabulary</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {prompt.usefulLanguage.map((id) => { const r = getSense(id); return r && (
                  <li key={id}><Link href={`/vocabulary/${r.item.slug}#${id}`} className="chip !text-[13px] hover:border-primary hover:text-primary">{r.item.lemma}</Link></li>
                ); })}
                {prompt.vocabulary.map((v) => <li key={v} className="chip !text-[13px]">{v}</li>)}
              </ul>
              {prompt.collocations.length > 0 && <><p className="mt-3 text-sm font-semibold">Collocations</p><p className="mt-1 text-[15px] text-muted">{prompt.collocations.join(" · ")}</p></>}
            </div>
          )}
          {getEssayGuide(prompt.genre) && (
            <div className="card p-5">
              <p className="font-bold">Linking for {ESSAY_LABEL[prompt.genre].toLowerCase()} essays</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">{getEssayGuide(prompt.genre)!.linking.map((l) => <li key={l} className="chip !text-[13px]">{l}</li>)}</ul>
            </div>
          )}
          {prompt.ideas.length > 0 && <IdeasPanel ideas={prompt.ideas} />}
          {history.length > 0 && (
            <div className="card p-5">
              <p className="flex items-center gap-2 font-bold"><History size={16} aria-hidden="true" /> Your earlier attempts</p>
              <ul className="mt-2 space-y-1">
                {history.map((h) => (
                  <li key={h.id}><button onClick={() => { setCurrent(h); requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" })); }}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">{new Date(h.createdAt).toLocaleString()} · {h.wordCount} words</button></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <div ref={resultRef} className="mt-10 scroll-mt-24">
        {current && parsed?.success && <FeedbackView feedback={parsed.data} source={current.body} kind="writing" />}
      </div>
    </article>
  );
}

function IdeasPanel({ ideas }: { ideas: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-5">
      <p className="font-bold">Ideas and arguments to explore</p>
      {open ? <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px]">{ideas.map((i) => <li key={i}>{i}</li>)}</ul>
        : <><p className="mt-1 text-sm text-muted">Try planning on your own first.</p><button onClick={() => setOpen(true)} className="btn btn-ghost mt-2 !min-h-0 !py-1.5 text-sm">Show ideas</button></>}
    </div>
  );
}
