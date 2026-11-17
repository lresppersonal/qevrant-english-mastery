"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Shuffle } from "lucide-react";
import clsx from "clsx";
import { allSynExercises, SYN_TYPES, TYPE_LABEL, type SynType } from "@/lib/synonyms";
import { SynonymExercises } from "@/components/SynonymExercises";

/** A mixed set across groups (interleaved), optionally of one exercise type. */
export default function SynonymPractice() {
  const [type, setType] = useState<SynType | "all">("all");
  const [seed, setSeed] = useState(() => Date.now());
  const set = useMemo(() => {
    const pool = allSynExercises().filter((e) => type === "all" || e.type === type);
    let a = seed % 2147483647;
    const rand = () => (a = (a * 48271) % 2147483647) / 2147483647;
    const byGroup = new Map<string, number>();
    return pool.map((e) => ({ e, k: rand() })).sort((x, y) => x.k - y.k).map((x) => x.e)
      .filter((e) => { const n = byGroup.get(e.group) ?? 0; byGroup.set(e.group, n + 1); return n < 1 || type !== "all"; }).slice(0, 12);
  }, [type, seed]);
  return (
    <>
      <Link href="/vocabulary/synonyms" className="mb-2 inline-flex items-center gap-1 py-2.5 text-sm font-medium text-muted hover:text-ink"><ArrowLeft size={15} aria-hidden="true" /> Academic & Advanced Synonyms</Link>
      <h1 className="text-3xl font-extrabold">Mixed synonym practice</h1>
      <p className="mt-2 max-w-2xl text-muted">Twelve questions from different groups, so you compare words you studied separately. Choose a type to focus on one skill.</p>
      <div className="mb-5 mt-4 flex flex-wrap gap-2" role="group" aria-label="Exercise type">
        {(["all", ...SYN_TYPES] as const).map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={clsx("chip !py-1.5 !px-3 text-sm", type === t && "!border-primary !bg-primary-soft !text-primary")}>{t === "all" ? "All types" : TYPE_LABEL[t]}</button>
        ))}
        <button type="button" className="btn btn-ghost !min-h-9 !px-3 text-sm" onClick={() => setSeed(Date.now())}><Shuffle size={14} aria-hidden="true" /> New set</button>
      </div>
      <SynonymExercises key={`${type}-${seed}`} exercises={set} slug="synonyms-mixed" />
    </>
  );
}
