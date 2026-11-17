"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ArrowLeft, Sparkles, Loader2, History, RefreshCw } from "lucide-react";
import type { WritingPrompt } from "@/lib/content/schema";
import { getSense, getEssayGuide, getTheme } from "@/lib/content";
import { ESSAY_LABEL } from "@/lib/essay";
import { countWords, WritingFeedbackView } from "@/lib/ai/schemas";
import type { WritingSubmission } from "@/lib/store/types";
import { useLearner } from "./StoreProvider";
import { useAiStatus } from "./useAiStatus";
import { FeedbackView } from "./FeedbackView";
import { LevelBadge } from "./ui";

type SaveState = { local: string | null; account: "idle" | "saving" | "saved" | "error"; accountAt?: string };

/** Reads a fetch response that may not be JSON (e.g. a gateway timeout page). */
async function readJson(r: Response): Promise<Record<string, unknown>> {
  const text = await r.text();
  try { return JSON.parse(text); } catch {
    if (r.status === 504 || r.status === 408) return { error: "The assessment took longer than the server allows.", retry: true };
    if (r.status === 413) return { error: "The essay is too long to send.", retry: false };
    return { error: `The server returned an unexpected response (${r.status}).`, retry: true };
  }
}

export function EssayWorkspace({ prompt }: { prompt: WritingPrompt }) {
  const { store, ready } = useLearner();
  const ai = useAiStatus();
  const draftKey = `qevrant.draft.writing.${prompt.slug}`;
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [save, setSave] = useState<SaveState>({ local: null, account: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; retry: boolean; submission: WritingSubmission | null } | null>(null);
  const [history, setHistory] = useState<WritingSubmission[]>([]);
  const [current, setCurrent] = useState<WritingSubmission | null>(null);
  const started = useRef<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const requestId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const accountTimer = useRef<number | null>(null);
  const words = countWords(body);
  const sendDraft = useRef<(text: string) => Promise<void>>(async () => {});

  const refreshHistory = useCallback(async () => {
    const all = await store.listWriting();
    const mine = all.filter((w) => w.promptSlug === prompt.slug);
    setHistory(mine);
    return mine;
  }, [store, prompt.slug]);

  // Restore the newest draft: this device or the account.
  useEffect(() => {
    if (!ready) return;
    let localDraft: { body: string; updatedAt: string } | null = null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) localDraft = raw.startsWith("{") ? JSON.parse(raw) : { body: raw, updatedAt: new Date(0).toISOString() };
    } catch { /* storage blocked */ }
    store.getDraft(prompt.slug).catch(() => null).then((remote) => {
      const pick = remote && (!localDraft || remote.updatedAt > localDraft.updatedAt) ? remote : localDraft;
      if (pick) { setBody(pick.body); setSave({ local: pick.updatedAt, account: remote ? "saved" : "idle", accountAt: remote?.updatedAt }); }
      setLoaded(true);
    });
    store.setLastPosition({ href: `/writing/${prompt.slug}`, label: `Essay: ${prompt.title}` }).catch(() => {});
    refreshHistory().catch(() => {});
  }, [ready, store, prompt, draftKey, refreshHistory]);

  sendDraft.current = async (text: string) => {
    setSave((s) => ({ ...s, account: "saving" }));
    try { await store.saveDraft(prompt.slug, text); setSave((s) => ({ ...s, account: "saved", accountAt: new Date().toISOString() })); }
    catch { setSave((s) => ({ ...s, account: "error" })); }
  };

  function onChange(text: string) {
    if (!started.current) started.current = Date.now();
    setBody(text);
    requestId.current = null; // edited text = a new submission
    const at = new Date().toISOString();
    try { localStorage.setItem(draftKey, JSON.stringify({ body: text, updatedAt: at })); setSave((s) => ({ ...s, local: at })); } catch { /* storage full or blocked */ }
    if (accountTimer.current) clearTimeout(accountTimer.current);
    accountTimer.current = window.setTimeout(() => void sendDraft.current(text), 1500);
  }
  useEffect(() => () => { if (accountTimer.current) clearTimeout(accountTimer.current); }, []);

  function show(sub: WritingSubmission) {
    setCurrent(sub);
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function submit(retryOf?: WritingSubmission) {
    if (inFlight.current) return; // one request at a time, even with fast double clicks
    inFlight.current = true;
    setBusy(true); setError(null);
    if (!retryOf) {
      requestId.current ??= crypto.randomUUID();
      if (accountTimer.current) clearTimeout(accountTimer.current);
      await sendDraft.current(body); // make sure the latest text is saved first
    }
    const isServerRow = retryOf && store.mode === "supabase";
    const payload = isServerRow
      ? { promptSlug: prompt.slug, submissionId: retryOf!.id }
      : { promptSlug: prompt.slug, body: retryOf?.body ?? body, requestId: requestId.current ?? crypto.randomUUID(), secondsSpent: started.current ? Math.round((Date.now() - started.current) / 1000) : null };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 295_000);
    try {
      const r = await fetch("/api/ai/writing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctl.signal });
      const json = await readJson(r);
      if (!r.ok) {
        const err = new Error(String(json.error ?? "The assessment failed.")) as Error & { retry?: boolean; submission?: WritingSubmission | null; status?: number };
        err.retry = json.retry !== false; err.submission = (json.submission as WritingSubmission) ?? null; err.status = r.status;
        throw err;
      }
      let sub = json.submission as WritingSubmission;
      if (!json.persisted && store.addWritingLocal) {
        if (retryOf && store.updateWritingLocal) { await store.updateWritingLocal(retryOf.id, { feedback: sub.feedback, status: "assessed", error: null }); sub = { ...retryOf, feedback: sub.feedback, status: "assessed", error: null }; }
        else sub = await store.addWritingLocal({ promptSlug: sub.promptSlug, body: sub.body, wordCount: sub.wordCount, secondsSpent: sub.secondsSpent, feedback: sub.feedback, status: "assessed" });
        await store.logEvent({ type: "writing_submitted", contentType: "writing", contentRef: prompt.slug, payload: { words: sub.wordCount } });
      }
      requestId.current = null; // the next click is a new submission
      await refreshHistory().catch(() => setHistory((h) => [sub, ...h.filter((x) => x.id !== sub.id)]));
      show(sub);
    } catch (e) {
      const x = e as Error & { retry?: boolean; submission?: WritingSubmission | null; status?: number };
      let message = x.name === "AbortError" ? "The assessment is taking too long." : e instanceof TypeError ? (navigator.onLine ? "The server couldn't be reached." : "You're offline.") : x.message;
      let saved: WritingSubmission | null = x.submission ?? null;
      if (x.status === 409) {
        message = "This essay is already being assessed. The result will appear in “Your submissions” shortly.";
        setTimeout(() => refreshHistory().catch(() => {}), 8000);
      } else if (!saved && store.mode === "supabase") {
        // The request may still have reached the server: look for the saved essay.
        saved = (await refreshHistory().catch(() => [])).find((w) => w.body === (retryOf?.body ?? body) && w.status !== "assessed") ?? null;
      } else if (!saved && store.addWritingLocal) {
        // Demo mode: keep the essay as a saved, unassessed submission.
        saved = retryOf ?? await store.addWritingLocal({ promptSlug: prompt.slug, body, wordCount: words, secondsSpent: null, feedback: null, status: "failed", error: message });
        if (retryOf && store.updateWritingLocal) await store.updateWritingLocal(retryOf.id, { status: "failed", error: message });
        requestId.current = null;
        await refreshHistory().catch(() => {});
      }
      setError({ message, retry: x.retry !== false, submission: saved });
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      setBusy(false);
    }
  }

  function startNew() {
    if (body.trim() && !window.confirm("Start a new attempt? Your current text stays in “Your submissions” only if you've submitted it.")) return;
    onChange(""); setCurrent(null); setError(null); requestId.current = null; started.current = null;
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
          <textarea id="essay" value={body} onChange={(e) => onChange(e.target.value)} disabled={!loaded}
            rows={18} spellCheck={false} placeholder={loaded ? "Start writing here. Your draft is saved automatically." : "Loading your draft…"}
            className="input mt-2 resize-y font-[450] text-[16.5px] leading-[1.8]" aria-describedby="wc" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p id="wc" className={words >= prompt.minWords ? "text-sm font-semibold text-success" : "text-sm text-muted"} aria-live="polite">
              {words} words{words < prompt.minWords ? ` · ${prompt.minWords - words} to go` : " · length OK"}
            </p>
            <p className="text-xs text-muted" data-testid="save-status" aria-live="polite">
              {save.local ? "Saved on this device" : "Not saved yet"}
              {store.mode === "supabase" && (save.account === "saving" ? " · saving to your account…" : save.account === "saved" ? ` · saved to your account${save.accountAt ? ` ${new Date(save.accountAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}` : save.account === "error" ? " · couldn't reach your account, will retry" : "")}
            </p>
            <div className="ml-auto flex items-center gap-2">
              {(body.trim() || current) && <button type="button" onClick={startNew} disabled={busy} className="btn btn-ghost">New attempt</button>}
              <button onClick={() => submit()} disabled={busy || !ai?.enabled || words < 80} className="btn btn-primary">
                {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Analysing… (up to a minute)</> : <><Sparkles size={16} aria-hidden="true" /> Get AI feedback</>}
              </button>
            </div>
          </div>
          {ai && !ai.enabled && <p className="mt-2 text-sm text-muted">{ai.reason}</p>}
          {ai?.enabled && words < 80 && <p className="mt-2 text-sm text-muted">Feedback unlocks at 80 words.</p>}
          {error && (
            <div role="alert" className="mt-3 rounded-xl border border-danger/40 px-4 py-3" data-testid="writing-error">
              <p className="font-semibold text-danger">{error.message}</p>
              <p className="mt-1 text-sm">{error.submission || body.trim() ? "Your essay is saved — nothing has been lost." : ""} {error.retry ? "You can retry the assessment now or later from “Your submissions”." : ""}</p>
              {error.retry && <button type="button" className="btn btn-primary mt-2" disabled={busy || !ai?.enabled} onClick={() => submit(error.submission ?? undefined)}><RefreshCw size={16} aria-hidden="true" /> Retry assessment</button>}
            </div>
          )}
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
              <p className="flex items-center gap-2 font-bold"><History size={16} aria-hidden="true" /> Your submissions</p>
              <Link href="/writing/portfolio" className="mt-1 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Compare versions in your portfolio</Link>
              <ul className="mt-2 space-y-1" data-testid="submissions">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-1">
                    <button onClick={() => (h.status === "assessed" || !h.status ? show(h) : (setBody(h.body), setCurrent(null)))}
                      className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                      {new Date(h.createdAt).toLocaleString()} · {h.wordCount} words
                      <span className={clsx("block text-xs", h.status === "failed" ? "text-danger" : "text-muted")}>{h.status === "failed" ? "Saved · not assessed yet" : h.status === "pending" ? "Saved · assessment in progress" : "Assessed"}</span>
                    </button>
                    {h.status === "failed" && <button type="button" className="btn btn-ghost !min-h-9 !px-2 text-sm" disabled={busy || !ai?.enabled} onClick={() => submit(h)}>Retry</button>}
                  </li>
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
