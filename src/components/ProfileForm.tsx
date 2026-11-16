"use client";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useLearner } from "./StoreProvider";
import type { Goal } from "@/lib/store/types";
import { LEVELS, type Level } from "@/lib/content/schema";

const GOALS: { id: Goal; label: string; hint: string }[] = [
  { id: "ielts", label: "IELTS Academic", hint: "Prepare for the test" },
  { id: "university", label: "University study", hint: "Study or research in English" },
  { id: "professional", label: "Professional English", hint: "Communicate at work" },
  { id: "general", label: "General mastery", hint: "Become a confident C1/C2 user" },
];
const LEVEL_HINT: Record<Level, string> = {
  B2: "I can discuss familiar topics but make noticeable errors with complex structures.",
  "B2+": "I'm comfortable at B2 and starting to use more advanced structures.",
  C1: "I express myself fluently; I want more precision and range.",
  C2: "I'm near-native; I want nuance, style and register control.",
};

export function ProfileForm({ submitLabel, onDone }: { submitLabel: string; onDone?: () => void }) {
  const { profile, store, refresh, toast } = useLearner();
  const [name, setName] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState(4);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName ?? ""); setGoals(profile.goals); setLevel(profile.selfLevel); setDays(profile.weeklyGoalDays);
  }, [profile]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await store.updateProfile({ displayName: name.trim() || null, goals, selfLevel: level, weeklyGoalDays: days, onboardedAt: profile?.onboardedAt ?? new Date().toISOString() });
      await refresh();
      toast("Study plan saved");
      onDone?.();
    } catch (err) {
      toast(`Couldn't save: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <label className="block max-w-sm text-sm font-semibold">What should we call you?
        <input className="input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold">What are you learning for? <span className="font-normal text-muted">Choose any.</span></legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => {
            const on = goals.includes(g.id);
            return (
              <label key={g.id} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", on ? "border-primary bg-primary-soft" : "border-line bg-surface")}>
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={on} onChange={() => setGoals(on ? goals.filter((x) => x !== g.id) : [...goals, g.id])} />
                <span><span className="block font-semibold">{g.label}</span><span className="text-sm text-muted">{g.hint}</span></span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Which description fits you best? <span className="font-normal text-muted">A self-rating; you can change it any time.</span></legend>
        <div className="mt-2 grid gap-2">
          {LEVELS.map((l) => (
            <label key={l} className={clsx("flex cursor-pointer items-start gap-3 rounded-xl border p-3", level === l ? "border-primary bg-primary-soft" : "border-line bg-surface")}>
              <input type="radio" name="level" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={level === l} onChange={() => setLevel(l)} />
              <span><span className="block font-semibold">{l}</span><span className="text-sm text-muted">{LEVEL_HINT[l]}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block max-w-sm text-sm font-semibold">Weekly goal: <span className="text-primary">{days} study {days === 1 ? "day" : "days"}</span>
        <input type="range" min={1} max={7} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary)]" />
      </label>

      <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
