"use client";
import { useEffect, useState } from "react";

export interface AiStatus { enabled: boolean; reason: string | null; transcription: "server" | "browser" }

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    fetch("/api/ai/status").then((r) => r.json()).then(setStatus).catch(() => setStatus({ enabled: false, reason: "Couldn't reach the server.", transcription: "browser" }));
  }, []);
  return status;
}
