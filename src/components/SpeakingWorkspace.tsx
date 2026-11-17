"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, Square, Sparkles, Loader2, RotateCcw, History } from "lucide-react";
import type { SpeakingPrompt } from "@/lib/content/schema";
import { getSense } from "@/lib/content";
import { SpeakingFeedbackView } from "@/lib/ai/schemas";
import type { SpeakingAttempt } from "@/lib/store/types";
import { useLearner } from "./StoreProvider";
import { micProblem, requestMic } from "@/lib/microphone";
import { useAiStatus } from "./useAiStatus";
import { FeedbackView } from "./FeedbackView";
import { LevelBadge } from "./ui";

type Phase = "idle" | "prep" | "recording" | "transcribing" | "review" | "analysing";

/* Minimal typing for the Web Speech API (not in TS DOM lib everywhere). */
type SR = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const getSR = (): (new () => SR) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function SpeakingWorkspace({ prompt }: { prompt: SpeakingPrompt }) {
  const { store, ready } = useLearner();
  const ai = useAiStatus();
  const [phase, setPhase] = useState<Phase>("idle");
  const [left, setLeft] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SpeakingAttempt[]>([]);
  const [current, setCurrent] = useState<SpeakingAttempt | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const sr = useRef<SR | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const finalText = useRef("");
  const resultRef = useRef<HTMLDivElement>(null);

  const browserSR = typeof window !== "undefined" && !!getSR();
  const canTranscribe = ai?.transcription === "server" || browserSR;

  useEffect(() => {
    if (!ready) return;
    store.setLastPosition({ href: `/speaking/${prompt.slug}`, label: `Speaking: ${prompt.title}` }).catch(() => {});
    store.listSpeaking().then((all) => setHistory(all.filter((a) => a.promptSlug === prompt.slug))).catch(() => {});
  }, [ready, store, prompt]);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function countdown(seconds: number, onEnd: () => void) {
    if (timer.current) clearInterval(timer.current);
    setLeft(seconds);
    const end = Date.now() + seconds * 1000;
    timer.current = window.setInterval(() => {
      const s = Math.ceil((end - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) { clearInterval(timer.current!); timer.current = null; onEnd(); }
    }, 250);
  }

  function begin() {
    setError(null); setTranscript(""); setInterim(""); setCurrent(null); setAudioPath(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    if (prompt.prepSeconds > 0) { setPhase("prep"); countdown(prompt.prepSeconds, startRecording); }
    else void startRecording();
  }

  async function startRecording() {
    try {
      const stream = await requestMic();
      chunks.current = [];
      finalText.current = "";
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); void afterStop(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" })); };
      rec.current = mr;

      if (ai?.transcription !== "server") {
        const Ctor = getSR();
        if (Ctor) {
          const r = new Ctor();
          r.lang = "en-GB"; r.continuous = true; r.interimResults = true;
          r.onresult = (e) => {
            let interimText = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const res = e.results[i];
              if (res.isFinal) finalText.current += res[0].transcript.trim() + ". ";
              else interimText += res[0].transcript;
            }
            setInterim(interimText);
            setTranscript(finalText.current.trim());
          };
          r.onerror = (e) => { if (e.error === "not-allowed") setError("Speech recognition was blocked by the browser."); };
          r.onend = () => { if (rec.current?.state === "recording") { try { r.start(); } catch {} } };
          sr.current = r;
          r.start();
        }
      }
      mr.start(1000);
      startedAt.current = Date.now();
      setPhase("recording");
      countdown(prompt.speakSeconds, stop);
    } catch (e) {
      setPhase("idle");
      const p = micProblem(e);
      setError(`${p.message} ${p.help.join(" ")}`);
    }
  }

  function stop() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setDuration(Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
    const r = sr.current; sr.current = null;
    if (rec.current?.state === "recording") rec.current.stop();
    if (r) { r.onend = null; try { r.stop(); } catch {} }
  }

  async function afterStop(blob: Blob) {
    setAudioUrl(URL.createObjectURL(blob));
    if (ai?.transcription === "server") {
      setPhase("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", blob, "answer.webm");
        const r = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Transcription failed");
        setTranscript(json.text);
        setAudioPath(json.audioPath ?? null);
      } catch (e) {
        setError((e as Error).message);
      }
    } else {
      // give the recogniser a moment to deliver its last result
      await new Promise((res) => setTimeout(res, 600));
      setTranscript((t) => (finalText.current.trim() || t).trim());
      setInterim("");
    }
    setPhase("review");
  }

  async function analyse() {
    setPhase("analysing"); setError(null);
    try {
      const r = await fetch("/api/ai/speaking", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptSlug: prompt.slug, transcript, durationSeconds: duration, audioPath }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Request failed");
      let att: SpeakingAttempt = json.attempt;
      if (!json.persisted && store.addSpeakingLocal) {
        att = await store.addSpeakingLocal({ promptSlug: att.promptSlug, transcript: att.transcript, durationSeconds: att.durationSeconds, metrics: att.metrics, feedback: att.feedback });
        await store.logEvent({ type: "speaking_submitted", contentType: "speaking", contentRef: prompt.slug, payload: { seconds: att.durationSeconds } });
      }
      setCurrent(att);
      setHistory((h) => [att, ...h]);
      setPhase("idle");
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError((e as Error).message);
      setPhase("review");
    }
  }

  const parsed = current ? SpeakingFeedbackView.safeParse(current.feedback) : null;

  return (
    <article>
      <Link href="/speaking" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Speaking</Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2"><LevelBadge level={prompt.level} /><span className="chip">Prepare {prompt.prepSeconds}s</span><span className="chip">Speak up to {fmt(prompt.speakSeconds)}</span></div>
          <h1 className="text-3xl font-extrabold">{prompt.title}</h1>
          <div className="card mt-4 border-l-4 !border-l-primary p-5">
            <p className="text-[17px] font-medium leading-relaxed">{prompt.prompt}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[16px]">{prompt.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>

          <div className="card mt-6 p-6 text-center" aria-live="polite">
            {phase === "idle" && (
              <>
                <button onClick={begin} disabled={!canTranscribe} className="btn btn-primary !px-6 !py-3 text-base"><Mic size={18} aria-hidden="true" /> {current ? "Try again" : "Start"}</button>
                {!canTranscribe && <p className="mt-3 text-sm text-muted">Your browser can't turn speech into text. Please use Chrome, Edge or Safari.</p>}
                {ai?.transcription === "browser" && canTranscribe && <p className="mt-3 text-xs text-muted">Your speech is transcribed by your browser's speech recognition.</p>}
              </>
            )}
            {phase === "prep" && (
              <>
                <p className="eyebrow">Preparation time</p>
                <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{fmt(left)}</p>
                <p className="mt-2 text-sm text-muted">Plan your answer. Recording starts automatically.</p>
                <button onClick={() => { if (timer.current) clearInterval(timer.current); void startRecording(); }} className="btn btn-ghost mt-4">Start speaking now</button>
              </>
            )}
            {phase === "recording" && (
              <>
                <p className="eyebrow flex items-center justify-center gap-2"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" /> Recording</p>
                <p className="mt-1 font-display text-5xl font-extrabold tabular-nums">{fmt(left)}</p>
                {(transcript || interim) && <p className="mx-auto mt-3 max-w-xl text-left text-[15px] text-muted">{transcript} <span className="italic">{interim}</span></p>}
                <button onClick={stop} className="btn btn-primary mt-4"><Square size={16} aria-hidden="true" /> Stop</button>
              </>
            )}
            {(phase === "transcribing" || phase === "analysing") && (
              <p className="flex items-center justify-center gap-2 font-semibold"><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {phase === "transcribing" ? "Transcribing…" : "Analysing your answer… (about 20 s)"}</p>
            )}
            {phase === "review" && (
              <div className="text-left">
                {audioUrl && <audio controls src={audioUrl} className="w-full" aria-label="Your recording" />}
                <label htmlFor="transcript" className="mt-4 block font-semibold">Transcript</label>
                <p className="text-sm text-muted">Correct any words the recogniser misheard, but don't rewrite what you said: the feedback is about your speaking.</p>
                <textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={7} className="input mt-2 text-[15.5px] leading-relaxed" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={analyse} disabled={!ai?.enabled || transcript.trim().split(/\s+/).length < 25} className="btn btn-primary"><Sparkles size={16} aria-hidden="true" /> Get AI feedback</button>
                  <button onClick={begin} className="btn btn-ghost"><RotateCcw size={16} aria-hidden="true" /> Record again</button>
                </div>
                {ai && !ai.enabled && <p className="mt-2 text-sm text-muted">{ai.reason}</p>}
                {transcript.trim().split(/\s+/).filter(Boolean).length < 25 && <p className="mt-2 text-sm text-muted">We need at least 25 words to give useful feedback.</p>}
              </div>
            )}
            {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="font-bold">Useful language</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {prompt.usefulLanguage.map((id) => { const r = getSense(id); return r && (
                <li key={id}><Link href={`/vocabulary/${r.item.slug}#${id}`} className="chip !text-[13px] hover:border-primary hover:text-primary">{r.item.lemma}</Link></li>
              ); })}
            </ul>
          </div>
          {history.length > 0 && (
            <div className="card p-5">
              <p className="flex items-center gap-2 font-bold"><History size={16} aria-hidden="true" /> Earlier attempts</p>
              <ul className="mt-2 space-y-1">
                {history.map((h) => (
                  <li key={h.id}><button onClick={() => { setCurrent(h); requestAnimationFrame(() => resultRef.current?.scrollIntoView({ block: "start" })); }}
                    className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2">{new Date(h.createdAt).toLocaleString()} · {fmt(h.durationSeconds)}</button></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
      <div ref={resultRef} className="mt-10 scroll-mt-24">
        {current && parsed?.success && <FeedbackView feedback={parsed.data} source={current.transcript} metrics={current.metrics} kind="speaking" />}
      </div>
    </article>
  );
}
