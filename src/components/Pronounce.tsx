"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Volume2, Loader2 } from "lucide-react";

type Accent = "uk" | "us";
const LANG: Record<Accent, string> = { uk: "en-GB", us: "en-US" };
const LABEL: Record<Accent, string> = { uk: "UK", us: "US" };

/** Voices installed on this device for an accent (Web Speech API). */
function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  return voices;
}
const voiceFor = (voices: SpeechSynthesisVoice[], accent: Accent) =>
  voices.find((v) => v.lang.replace("_", "-") === LANG[accent] && /natural|neural|premium|enhanced|google/i.test(v.name)) ??
  voices.find((v) => v.lang.replace("_", "-") === LANG[accent]);

/**
 * British and American pronunciation. Order of preference for each accent:
 *   1. a human recording (Wiktionary / Wikimedia Commons)
 *   2. a neural text-to-speech voice on our server (when GOOGLE_TTS_API_KEY is set)
 *   3. a voice for that accent installed on the learner's device
 * If none is available, a clear note is shown instead of a dead button.
 */
export function Pronounce({ word, ipa, audio, serverTts }: { word: string; ipa: { uk?: string; us?: string }; audio: { uk?: string; us?: string }; serverTts?: boolean }) {
  const voices = useVoices();
  const [playing, setPlaying] = useState<Accent | null>(null);
  const [err, setErr] = useState<Partial<Record<Accent, string>>>({});

  const method = (a: Accent): "recording" | "service" | "device" | null =>
    audio[a] ? "recording" : serverTts ? "service" : voiceFor(voices, a) ? "device" : null;

  function speakDevice(a: Accent) {
    const v = voiceFor(voices, a);
    if (!v) { setErr((e) => ({ ...e, [a]: `No ${LABEL[a]} voice on this device.` })); setPlaying(null); return; }
    const u = new SpeechSynthesisUtterance(word);
    try { u.voice = v; } catch { /* voice objects from some browsers cannot be reassigned */ } u.lang = v.lang; u.rate = 0.85;
    u.onend = () => setPlaying(null); u.onerror = () => { setPlaying(null); setErr((e) => ({ ...e, [a]: "Your device couldn't play this voice." })); };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
  async function playUrl(url: string) {
    const el = new Audio(url);
    await el.play();
    await new Promise<void>((res) => { el.onended = () => res(); el.onerror = () => res(); setTimeout(res, 6000); });
  }
  async function play(a: Accent) {
    setErr((e) => ({ ...e, [a]: undefined })); setPlaying(a);
    const m = method(a);
    try {
      if (m === "recording") await playUrl(audio[a]!);
      else if (m === "service") await playUrl(`/api/dictionary/tts?accent=${a}&text=${encodeURIComponent(word)}`);
      else return speakDevice(a);
      setPlaying(null);
    } catch {
      // recording or service failed: fall back to the device voice if there is one
      if (voiceFor(voices, a)) return speakDevice(a);
      setPlaying(null);
      setErr((e) => ({ ...e, [a]: "Audio couldn't be played. Check your connection or sound settings." }));
    }
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="pronounce">
      {(["uk", "us"] as Accent[]).map((a) => {
        const m = method(a);
        return (
          <div key={a} className="min-w-0">
            {m ? (
              <button type="button" onClick={() => play(a)} aria-label={`Play ${LABEL[a]} pronunciation of ${word}`} data-method={m}
                className={clsx("inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold", playing === a ? "border-primary bg-primary-soft" : "border-line hover:border-primary")}>
                {playing === a ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
                {LABEL[a]} {ipa[a] && <span className="font-normal text-muted">{ipa[a]}</span>}
              </button>
            ) : (
              <p className="inline-flex min-h-10 items-center gap-2 rounded-full border border-dashed border-line px-3 text-sm text-muted" data-testid={`no-audio-${a}`}>
                {LABEL[a]} {ipa[a] && <span>{ipa[a]}</span>} <span className="text-xs">· no {LABEL[a]} audio available on this device</span>
              </p>
            )}
            {err[a] && <p role="alert" className="mt-1 text-xs text-danger">{err[a]}</p>}
          </div>
        );
      })}
    </div>
  );
}
