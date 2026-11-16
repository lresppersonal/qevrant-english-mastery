"use client";
import { useEffect, useState } from "react";
import { useLearner } from "./StoreProvider";
import { mastery, type MasteryBand } from "@/lib/progress";

const LABEL: Record<MasteryBand, string> = { not_started: "Not started", practising: "Practising", secure: "Secure", mastered: "Mastered" };

export function useMastery(target: string) {
  const { store, ready } = useLearner();
  const [m, setM] = useState<ReturnType<typeof mastery> | null>(null);
  useEffect(() => {
    if (!ready) return;
    store.listResponses().then((r) => setM(mastery(r, target))).catch(() => setM(null));
  }, [store, ready, target]);
  return m;
}

export function MasteryChip({ target }: { target: string }) {
  const m = useMastery(target);
  if (!m) return null;
  const tone = m.band === "mastered" || m.band === "secure" ? "text-success border-success/40" : "";
  return <span className={`chip ${tone}`} title={m.answered ? `${Math.round(m.accuracy * 100)}% of your last ${m.answered} answers correct` : undefined}>{LABEL[m.band]}</span>;
}
