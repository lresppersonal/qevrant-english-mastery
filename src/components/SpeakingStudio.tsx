"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Dices, Mic, Pause, Play, RotateCcw, Square, Sparkles, Loader2, History, Shuffle, Trash2 } from "lucide-react";
import { SPEAKING_CATEGORIES, SPEAKING_LEVELS, SPEAKING_MODES, bankPrompt, categoryTitle, matchingPrompts, pickPrompt, type BankPrompt, type SpeakingLevel, type SpeakingMode } from "@/lib/speaking-bank";
import { Countdown, fmtClock } from "@/lib/countdown";
import { SpeakingFeedbackView } from "@/lib/ai/schemas";
import type { SpeakingAttempt } from "@/lib/store/types";
import { useLearner } from "./StoreProvider";
import { useAiStatus } from "./useAiStatus";
import { FeedbackView } from "./FeedbackView";
import { LevelBadge } from "./ui";

type Phase = "setup" | "prep" | "speaking" | "transcribing" | "review" | "analysing" | "done";

type SR = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const getSR = (): (new () => SR) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const RECENT_KEY = "em-speaking-recent";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; } };
const writeRecent = (ids: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(-60))); } catch { /* storage unavailable */ } };

/** Human-readable microphone errors. */
function micError(e: unknown): string {
  const name = (e as { name?: string })?.name ?? "";
  if (typeof window !== "undefined" && !window.isSecureContext) return "The microphone only works on a secure (https) page. Open the platform through its https address.";
  if (!navigator.mediaDevices?.getUserMedia) return "This browser can't record audio. Please use a recent version of Chrome, Edge, Safari or Firefox.";
  if (name === "NotAllowedError" || name === "SecurityError") return "Microphone access was blocked. Click the lock or microphone icon in the address bar, allow the microphone for this site, then press Start again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No microphone was found. Connect a microphone or headset and try again.";
  if (name === "NotReadableError" || name === "AbortError") return "Your microphone is being used by another app (for example a video call). Close it and try again.";
  return "We couldn't start the microphone. Check your device settings and try again.";
}

const chip = (on: boolean) => clsx("min-h-10 shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold", on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface text-muted hover:text-ink");

export function SpeakingStudio() {
  const { store, ready } = useLearner();
  const ai = useAiStatus();
  const [level, setLevel] = useState<SpeakingLevel | "all">("B2+");
  const [category, setCategory] = useState<string>("all");
  const [mode, setMode] = useState<SpeakingMode>("one");
  const [topic, setTopic] = useState<BankPrompt | null>(null);
  const [phase, setPhase] = useState<Phase>("setup");
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [longPauses, setLongPauses] = useState<number | undefined>();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<SpeakingAttempt | null>(null);
  const [history, setHistory] = useState<SpeakingAttempt[]>([]);

  const cd = useRef<Countdown | null>(null);
  const tick = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const sr = useRef<SR | null>(null);
  const chunks = useRef<Blob[]>([]);
  const finalText = useRef("");
  const discard = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const m = SPEAKING_MODES[mode];
  const serverSTT = ai?.transcription === "server";
  const canTranscribe = serverSTT || (typeof window !== "undefined" && !!getSR());
  const poolSize = matchingPrompts(level, category).length;

  // Restore saved preferences and history.
  useEffect(() => {
    if (!ready) return;
    store.getProfile().then((p) => {
      const pref = (p?.preferences?.speaking ?? {}) as { level?: SpeakingLevel | "all"; category?: string; mode?: SpeakingMode };
      if (pref.level) setLevel(pref.level);
      if (pref.category) setCategory(pref.category);
      if (pref.mode && pref.mode in SPEAKING_MODES) setMode(pref.mode);
    }).catch(() => {});
    store.listSpeaking().then((all) => setHistory(all.filter((a) => a.promptSlug.startsWith("bank:")))).catch(() => {});
  }, [ready, store]);

  const savePrefs = useCallback(() => {
    store.getProfile().then((p) => store.updateProfile({ preferences: { ...(p?.preferences ?? {}), speaking: { level, category, mode } } })).catch(() => {});
  }, [store, level, category, mode]);

  const stopTicker = () => { if (tick.current) { clearInterval(tick.current); tick.current = null; } };
  const releaseMic = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  const stopSR = () => { const r = sr.current; sr.current = null; if (r) { r.onend = null; try { r.stop(); } catch { /* already stopped */ } } };
  useEffect(() => () => { stopTicker(); stopSR(); releaseMic(); }, []);

  function generate() {
    const recent = [...readRecent(), ...history.map((h) => h.promptSlug.slice(5))];
    const p = pickPrompt(level, category, recent);
    if (!p) { setError("No topics match these filters."); return; }
    writeRecent([...readRecent().filter((x) => x !== p.id), p.id]);
    setTopic(p); setError(null); setCurrent(null); setPhase("setup");
    savePrefs();
  }

  function runCountdown(seconds: number, onEnd: () => void) {
    stopTicker();
    cd.current = new Countdown(seconds * 1000);
    setRemaining(seconds * 1000); setPaused(false);
    tick.current = window.setInterval(() => {
      const c = cd.current; if (!c) return;
      setRemaining(c.remainingMs());
      if (c.done()) { stopTicker(); onEnd(); }
    }, 200);
  }

  async function start() {
    if (!topic) return;
    setError(null); setTranscript(""); setInterim(""); setCurrent(null); setAudioPath(null); setLongPauses(undefined);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    // Ask for the microphone first, so a permission prompt never eats preparation time.
    try {
      if (!stream.current) stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) { setError(micError(e)); setPhase("setup"); return; }
    setPhase("prep");
    runCountdown(m.prepSeconds, beginSpeaking);
  }

  function startSR() {
    if (serverSTT) return;
    const Ctor = getSR(); if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-GB"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript.trim() + ". ";
        else t += res[0].transcript;
      }
      setInterim(t); setTranscript(finalText.current.trim());
    };
    r.onerror = (e) => { if (e.error === "not-allowed") setError("Speech recognition was blocked by the browser. You can still type or paste a transcript after recording."); };
    r.onend = () => { if (rec.current?.state === "recording") { try { r.start(); } catch { /* restarting too fast */ } } };
    sr.current = r;
    try { r.start(); } catch { /* ignore */ }
  }

  function beginSpeaking() {
    const s = stream.current;
    if (!s) { setError("The microphone was disconnected. Press Start again."); setPhase("setup"); return; }
    chunks.current = []; finalText.current = ""; discard.current = false;
    let mr: MediaRecorder;
    try { mr = new MediaRecorder(s); } catch (e) { setError(micError(e)); setPhase("setup"); return; }
    mr.ondataavailable = (ev) => { if (ev.data.size) chunks.current.push(ev.data); };
    mr.onstop = () => { if (!discard.current) void afterStop(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })); };
    rec.current = mr;
    mr.start(1000);
    startSR();
    setPhase("speaking");
    runCountdown(m.speakSeconds, finishSpeaking);
  }

  function finishSpeaking() {
    stopTicker();
    const c = cd.current;
    setDuration(Math.max(1, Math.round((c ? c.elapsedMs() : m.speakSeconds * 1000) / 1000)));
    stopSR();
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    releaseMic();
  }

  function pause() {
    const c = cd.current; if (!c) return;
    c.pause(); setPaused(true); setRemaining(c.remainingMs());
    if (phase === "speaking") { if (rec.current?.state === "recording") rec.current.pause(); stopSR(); }
  }
  function resume() {
    const c = cd.current; if (!c) return;
    c.resume(); setPaused(false);
    if (phase === "speaking") { if (rec.current?.state === "paused") rec.current.resume(); startSR(); }
  }
  function restart() {
    stopTicker(); stopSR();
    discard.current = true;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    rec.current = null;
    setTranscript(""); setInterim(""); setPaused(false);
    void start();
  }
  function cancel() {
    stopTicker(); stopSR(); discard.current = true;
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    releaseMic(); setPhase("setup"); setPaused(false);
  }

  async function afterStop(blob: Blob) {
    setAudioUrl(URL.createObjectURL(blob));
    if (serverSTT) {
      setPhase("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "answer.webm");
        const r = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json.error ?? "Transcription failed. You can type your answer below instead.");
        setTranscript(json.text); setAudioPath(json.audioPath ?? null); setLongPauses(json.longPauses);
      } catch (e) { setError(e instanceof TypeError ? "Network error while transcribing. Check your connection." : (e as Error).message); }
    } else {
      await new Promise((res) => setTimeout(res, 600));
      setTranscript((t) => (finalText.current.trim() || t).trim()); setInterim("");
    }
    setPhase("review");
  }

  async function submit() {
    if (!topic) return;
    setPhase("analysing"); setError(null);
    try {
      const r = await fetch("/api/ai/speaking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId: topic.id, mode, transcript, durationSeconds: duration, longPauses, audioPath }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json.error ?? "The request failed. Please try again.");
      let att: SpeakingAttempt = json.attempt;
      if (!json.persisted && store.addSpeakingLocal) {
        att = await store.addSpeakingLocal({ promptSlug: att.promptSlug, transcript: att.transcript, durationSeconds: att.durationSeconds, metrics: att.metrics, feedback: att.feedback });
        await store.logEvent({ type: "speaking_submitted", contentType: "speaking", contentRef: att.promptSlug, payload: { seconds: att.durationSeconds, mode } });
      }
      setCurrent(att); setHistory((h) => [att, ...h]); setPhase("done");
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(e instanceof TypeError ? "Network error: your answer was not sent. Check your connection and press the button again." : (e as Error).message);
      setPhase("review");
    }
  }

  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const parsed = current ? SpeakingFeedbackView.safeParse(current.feedback) : null;
  const busy = phase === "prep" || phase === "speaking" || phase === "transcribing" || phase === "analysing";
  const viewTopic = current ? bankPrompt(current.promptSlug.slice(5)) ?? topic : topic;

  return (
    <section aria-labelledby="h-studio" className="mb-10">
      <div className="card p-5 sm:p-6">
        <h2 id="h-studio" className="flex items-center gap-2 text-xl font-bold"><Dices size={20} aria-hidden="true" /> Speaking studio</h2>
        <p className="mt-1 text-muted">Choose a level, a topic area and a duration, then generate a random topic. Preparation and speaking timers start automatically.</p>

        <fieldset disabled={busy} className="mt-5 space-y-4">
          <div>
            <legend className="mb-2 text-sm font-semibold">1 · Level</legend>
            <div role="group" aria-label="Level" className="scroll-row">{(["all", ...SPEAKING_LEVELS] as const).map((l) => <button key={l} type="button" aria-pressed={level === l} className={chip(level === l)} onClick={() => setLevel(l)}>{l === "all" ? "Any level" : l}</button>)}</div>
          </div>
          <div>
            <label htmlFor="sp-cat" className="mb-2 block text-sm font-semibold">2 · Category</label>
            <select id="sp-cat" className="input sm:!w-80" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All categories</option>
              {SPEAKING_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">3 · Duration</p>
            <div role="radiogroup" aria-label="Duration" className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(SPEAKING_MODES) as SpeakingMode[]).map((k) => {
                const md = SPEAKING_MODES[k];
                return (
                  <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                    className={clsx("rounded-xl border-2 p-3 text-left", mode === k ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50")}>
                    <span className="block font-bold">{md.label} answer</span>
                    <span className="text-sm text-muted">{md.prepSeconds} s preparation · {md.speakSeconds / 60} min speaking</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-primary" onClick={generate} disabled={poolSize === 0}>{topic ? <><Shuffle size={16} aria-hidden="true" /> New topic</> : <><Dices size={16} aria-hidden="true" /> Generate topic</>}</button>
            <span className="text-sm text-muted" aria-live="polite">{poolSize} topics match</span>
          </div>
        </fieldset>
      </div>

      {viewTopic && (
        <div className="card mt-5 border-l-4 !border-l-primary p-5 sm:p-6" data-testid="speaking-topic">
          <div className="flex flex-wrap items-center gap-2"><LevelBadge level={viewTopic.level} /><span className="chip">{categoryTitle(viewTopic.category)}</span><span className="chip">{m.label} · {m.prepSeconds}s + {m.speakSeconds}s</span></div>
          <p className="mt-3 text-xl font-semibold leading-snug">{viewTopic.prompt}</p>
          <p className="mt-3 text-sm font-semibold text-muted">You should say / cover:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{viewTopic.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      {topic && (
        <div className="card mt-5 p-5 text-center sm:p-6" aria-live="polite">
          {(phase === "setup" || phase === "done") && (
            <>
              <button type="button" onClick={start} disabled={!canTranscribe && !ai} className="btn btn-primary !px-6 !py-3 text-base"><Mic size={18} aria-hidden="true" /> {phase === "done" ? "Answer this topic again" : "Start"}</button>
              <p className="mt-3 text-sm text-muted">Your browser will ask for microphone access the first time. Preparation ({m.prepSeconds} s) begins once it's allowed.</p>
              {ai && !canTranscribe && <p className="mt-2 text-sm text-muted">This browser can't convert speech to text. You can still record and type what you said, or use Chrome, Edge or Safari.</p>}
            </>
          )}
          {(phase === "prep" || phase === "speaking") && (
            <>
              <p className="eyebrow flex items-center justify-center gap-2">
                {phase === "speaking" && !paused && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />}
                {phase === "prep" ? "Preparation" : "Speaking — recording"}{paused && " (paused)"}
              </p>
              <p className="mt-1 font-display text-6xl font-extrabold tabular-nums" role="timer" aria-label={`${fmtClock(remaining)} remaining`}>{fmtClock(remaining)}</p>
              <div className="mx-auto mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${100 - (remaining / ((phase === "prep" ? m.prepSeconds : m.speakSeconds) * 10))}%` }} />
              </div>
              {phase === "prep" && <p className="mt-2 text-sm text-muted">Make brief notes. Recording starts automatically when the timer ends.</p>}
              {phase === "speaking" && (transcript || interim) && <p className="mx-auto mt-3 max-w-xl text-left text-[15px] text-muted">{transcript} <span className="italic">{interim}</span></p>}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {paused ? <button type="button" className="btn btn-primary" onClick={resume}><Play size={16} aria-hidden="true" /> Resume</button>
                  : <button type="button" className="btn btn-ghost" onClick={pause}><Pause size={16} aria-hidden="true" /> Pause</button>}
                <button type="button" className="btn btn-ghost" onClick={restart}><RotateCcw size={16} aria-hidden="true" /> Restart</button>
                {phase === "prep" && <button type="button" className="btn btn-ghost" onClick={() => { stopTicker(); beginSpeaking(); }}>Start speaking now</button>}
                {phase === "speaking" && <button type="button" className="btn btn-primary" onClick={finishSpeaking}><Square size={16} aria-hidden="true" /> Finish</button>}
                <button type="button" className="btn btn-ghost" onClick={cancel}>Cancel</button>
              </div>
            </>
          )}
          {(phase === "transcribing" || phase === "analysing") && (
            <p className="flex items-center justify-center gap-2 font-semibold"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {phase === "transcribing" ? "Transcribing your answer…" : "Analysing your answer… (about 20–30 s)"}</p>
          )}
          {phase === "review" && (
            <div className="text-left">
              {audioUrl && <audio controls src={audioUrl} className="w-full" aria-label="Your recording" />}
              <label htmlFor="sp-transcript" className="mt-4 block font-semibold">Transcript ({words} words, {fmtClock(duration * 1000)} spoken)</label>
              <p className="text-sm text-muted">Fix words the recogniser misheard, but don't rewrite your answer — the feedback is about how you spoke.</p>
              <textarea id="sp-transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={7} className="input mt-2 text-[15.5px] leading-relaxed" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={submit} disabled={!ai?.enabled || words < 25} className="btn btn-primary"><Sparkles size={16} aria-hidden="true" /> Submit for AI feedback</button>
                <button type="button" onClick={start} className="btn btn-ghost"><RotateCcw size={16} aria-hidden="true" /> Record again</button>
              </div>
              {ai && !ai.enabled && <p className="mt-2 text-sm text-muted">{ai.reason}</p>}
              {words < 25 && <p className="mt-2 text-sm text-muted">We need at least 25 words to give useful feedback.</p>}
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      )}
      {!topic && error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <div ref={resultRef} className="mt-8 scroll-mt-24">
        {current && parsed?.success && <FeedbackView feedback={parsed.data} source={current.transcript} metrics={current.metrics} kind="speaking" />}
      </div>

      {history.length > 0 && (
        <details className="card mt-6 p-5">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><History size={16} aria-hidden="true" /> Your studio sessions ({history.length})</summary>
          <ul className="mt-3 divide-y divide-line">
            {history.slice(0, 30).map((h) => {
              const bp = bankPrompt(h.promptSlug.slice(5));
              const est = (h.feedback as { estimate?: { low: number; high: number } } | null)?.estimate;
              return (
                <li key={h.id} className="flex items-center gap-2 py-2">
                  <button type="button" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2" onClick={() => { setCurrent(h); requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" })); }}>
                    <span className="font-medium">{bp?.prompt ?? h.promptSlug}</span>
                    <span className="block text-muted">{new Date(h.createdAt).toLocaleString()} · {fmtClock(h.durationSeconds * 1000)}{est ? ` · est. ${est.low}–${est.high}` : ""}</span>
                  </button>
                  <button type="button" className="btn btn-ghost !min-h-9 !px-2" aria-label="Delete this session and its recording" onClick={async () => {
                    if (!confirm("Delete this session, its transcript, feedback and any stored recording?")) return;
                    await store.deleteSpeaking(h.id); setHistory((x) => x.filter((y) => y.id !== h.id)); if (current?.id === h.id) setCurrent(null);
                  }}><Trash2 size={16} aria-hidden="true" /></button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </section>
  );
}
