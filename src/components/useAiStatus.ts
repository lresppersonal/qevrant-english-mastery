"use client";
import { useEffect, useState } from "react";

export interface AiStatus { enabled: boolean; reason: string | null; transcription: "server" | "browser"; tts?: boolean; dictionaryAi?: boolean; offline?: boolean }

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = (attempt: number) => fetch("/api/ai/status", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => {
        if (cancelled) return;
        if (attempt < 2) { setTimeout(() => load(attempt + 1), 1500 * (attempt + 1)); return; }
        // No server behind this copy (e.g. the single-file preview) or the network is down.
        setStatus({ enabled: false, offline: true, transcription: "browser", reason: navigator.onLine
          ? "AI feedback runs on the platform's server, and this copy has no server connected (for example, the single-file preview). Open your deployed English Mastery address to use it. Your work is still saved."
          : "You're offline. Your work is saved on this device; AI feedback will be available when you're back online." });
      });
    load(0);
    return () => { cancelled = true; };
  }, []);
  return status;
}
