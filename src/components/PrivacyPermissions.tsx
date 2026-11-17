"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Mic, ShieldCheck, Play, Square, RefreshCw } from "lucide-react";
import { micProblem, micSupport, queryMicPermission, requestMic, stopStream, unblockSteps, watchMicPermission, type MicProblem, type MicState } from "@/lib/microphone";
import { getConsent, setConsent, STORAGE_INVENTORY, CONSENT_EVENT } from "@/lib/consent";

const STATE_LABEL: Record<MicState, { text: string; cls: string }> = {
  granted: { text: "Allowed", cls: "border-success text-success" },
  denied: { text: "Blocked", cls: "border-danger text-danger" },
  prompt: { text: "Not asked yet", cls: "border-line text-muted" },
  unknown: { text: "Not reported by this browser", cls: "border-line text-muted" },
};

/** Microphone: shows the real browser permission and lets the learner trigger the browser's own prompt and test recording. */
export function MicrophonePermission() {
  const [state, setState] = useState<MicState>("unknown");
  const [problem, setProblem] = useState<MicProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<"idle" | "recording" | "done">("idle");
  const [level, setLevel] = useState(0);
  const [clip, setClip] = useState<string | null>(null);
  const support = micSupport();
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    queryMicPermission().then(setState);
    let off = () => {};
    watchMicPermission(setState).then((f) => (off = f));
    return () => { off(); stopRef.current(); };
  }, []);

  async function allow() {
    setBusy(true); setProblem(null);
    try { const s = await requestMic(); stopStream(s); setState("granted"); }
    catch (e) { const p = micProblem(e); setProblem(p); if (p.code === "denied") setState("denied"); }
    finally { setBusy(false); setState(await queryMicPermission().then((q) => (q === "unknown" ? state : q))); }
  }

  async function test() {
    setProblem(null); setClip(null);
    let stream: MediaStream;
    try { stream = await requestMic(); setState("granted"); } catch (e) { setProblem(micProblem(e)); return; }
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(stream); } catch (e) { stopStream(stream); setProblem(micProblem(e)); return; }
    const chunks: Blob[] = [];
    rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
    rec.onstop = () => { stopStream(stream); setClip(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }))); setTesting("done"); setLevel(0); };
    // input level meter
    let raf = 0; let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const an = ctx.createAnalyser(); an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const loop = () => { an.getByteTimeDomainData(buf); let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); setLevel(Math.min(1, peak / 64)); raf = requestAnimationFrame(loop); };
      loop();
    } catch { /* meter is optional */ }
    const stop = () => { cancelAnimationFrame(raf); ctx?.close().catch(() => {}); if (rec.state !== "inactive") rec.stop(); };
    stopRef.current = stop;
    rec.start();
    setTesting("recording");
    setTimeout(stop, 4000);
  }

  const st = STATE_LABEL[state];
  return (
    <div className="space-y-3" data-testid="mic-permission">
      <div className="flex flex-wrap items-center gap-3">
        <Mic size={18} aria-hidden="true" />
        <span className="font-semibold">Microphone</span>
        <span className={clsx("chip", st.cls)} data-testid="mic-state" data-state={state}>{st.text}</span>
      </div>
      <p className="text-sm text-muted">
        The microphone is used only in Speaking, and only after you press Start. Access is controlled by your browser, not by this app:
        the button below asks the browser to show its own permission prompt. If you blocked access earlier, only your browser settings can undo that.
      </p>
      {!support.secure && <p role="alert" className="text-sm text-danger">This page isn't secure (https), so browsers don't allow the microphone here.</p>}
      <div className="flex flex-wrap gap-2">
        {state !== "granted" && <button type="button" className="btn btn-primary" onClick={allow} disabled={busy || !support.getUserMedia}><ShieldCheck size={16} aria-hidden="true" /> {state === "denied" ? "Try again" : "Allow microphone"}</button>}
        <button type="button" className="btn btn-ghost border border-line" onClick={testing === "recording" ? () => stopRef.current() : test} disabled={!support.getUserMedia}>
          {testing === "recording" ? <><Square size={16} aria-hidden="true" /> Stop test</> : <><Play size={16} aria-hidden="true" /> Test microphone (4 s)</>}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => queryMicPermission().then(setState)}><RefreshCw size={16} aria-hidden="true" /> Check again</button>
      </div>
      {testing === "recording" && (
        <div className="flex items-center gap-3" aria-live="polite"><span className="text-sm">Recording… say something</span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label="Input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}><div className="h-full bg-primary" style={{ width: `${level * 100}%` }} /></div>
        </div>
      )}
      {clip && <div data-testid="mic-test-result"><p className="text-sm font-semibold text-success">Recording works. Play it back to check the sound:</p><audio controls src={clip} className="mt-1 w-full max-w-sm" /></div>}
      {(problem || state === "denied") && (
        <div role="alert" className="rounded-xl border border-danger/40 px-4 py-3 text-sm" data-testid="mic-help">
          <p className="font-semibold text-danger">{problem?.message ?? "Microphone access is blocked for this site."}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">{(problem?.help ?? unblockSteps()).map((h) => <li key={h}>{h}</li>)}</ol>
        </div>
      )}
    </div>
  );
}

/** Cookie and storage choices; the same controls appear in Settings and on the privacy page. */
export function CookieSettings() {
  const [c, setC] = useState({ preferences: false, analytics: false });
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    const load = () => { const x = getConsent(); setC({ preferences: !!x?.preferences, analytics: !!x?.analytics }); setSaved(x?.at ?? null); };
    load();
    window.addEventListener(CONSENT_EVENT, load);
    return () => window.removeEventListener(CONSENT_EVENT, load);
  }, []);
  const row = (key: "preferences" | "analytics", title: string, desc: string, disabled = false) => (
    <label className="flex items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={c[key]} disabled={disabled} onChange={(e) => setC({ ...c, [key]: e.target.checked })} />
      <span><span className="block font-medium">{title}</span><span className="text-sm text-muted">{desc}</span></span>
    </label>
  );
  return (
    <div className="space-y-3" data-testid="cookie-settings">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4" checked disabled />
        <span><span className="block font-medium">Essential (always on)</span><span className="text-sm text-muted">Sign-in, security, saving your drafts and remembering these choices. The app can't work without them.</span></span>
      </label>
      {row("preferences", "Preferences", "Remember lesson display and recently shown speaking topics on this device.")}
      {row("analytics", "Analytics", "Not in use. English Mastery runs no analytics or tracking; this switch has no effect unless analytics are added in future.", true)}
      <button type="button" className="btn btn-primary" onClick={() => { setConsent(c); setSaved(new Date().toISOString()); }}>Save cookie choices</button>
      {saved && <p className="text-xs text-muted" role="status">Choices saved {new Date(saved).toLocaleString()}.</p>}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-primary">What exactly is stored</summary>
        {(["essential", "preferences", "analytics"] as const).map((k) => (
          <div key={k} className="mt-2"><p className="font-semibold capitalize">{k}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted">{STORAGE_INVENTORY[k].map((x) => <li key={x.name}><strong className="text-ink">{x.name}:</strong> {x.purpose} <em>({x.duration})</em></li>)}</ul></div>
        ))}
      </details>
    </div>
  );
}
