"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { Flame } from "./StreakFlame";
import { MILESTONES, type StreakState } from "@/lib/streak";

/** Short, dismissible card when today's first activity extends the streak, or the daily goal is reached. */
export function StreakCelebration({ kind, s, onDone }: { kind: "extended" | "goal"; s: StreakState; onDone: () => void }) {
  useEffect(() => { const t = window.setTimeout(onDone, 5200); return () => window.clearTimeout(t); }, [onDone]);
  const milestone = kind === "extended" && (MILESTONES as readonly number[]).includes(s.streak);
  const title = kind === "goal" ? "Daily goal complete" : milestone ? `${s.streak}-day milestone` : s.streak === 1 ? "Your streak has started" : `Streak extended: ${s.streak} days`;
  const body = kind === "goal"
    ? `${s.today} learning activities today. Anything more is a bonus.`
    : milestone ? `${s.streak} days in a row — your flame has grown.${s.next ? ` Next milestone: ${s.next} days.` : ""}`
    : s.goalMet ? "Today counts. Daily goal reached too." : `Today counts. ${Math.max(0, s.goal - s.today)} more ${s.goal - s.today === 1 ? "activity" : "activities"} to reach your daily goal.`;
  return (
    <div role="status" aria-live="polite" className="streak-pop pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4" data-testid="streak-celebration">
      <div className="anim-rise pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow-lift)]">
        <Flame tier={s.tier} lit size={34} igniting />
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold">{title}</p>
          <p className="text-sm text-muted">{body}</p>
        </div>
        <button type="button" onClick={onDone} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Dismiss"><X size={16} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
