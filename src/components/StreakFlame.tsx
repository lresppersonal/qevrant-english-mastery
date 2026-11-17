"use client";
import Link from "next/link";
import { useId } from "react";
import clsx from "clsx";
import type { FlameTier, StreakState } from "@/lib/streak";

/** Gradient stops per tier: amber for a new streak, deeper and brighter with milestones, a cool sapphire flame from 100 days. */
const TIERS: Record<FlameTier, { outer: [string, string]; core: [string, string]; glow: string; label: string }> = {
  ember: { outer: ["var(--flame-off-a)", "var(--flame-off-b)"], core: ["var(--flame-off-core)", "var(--flame-off-core)"], glow: "transparent", label: "Not lit yet" },
  flame: { outer: ["#F6BF4A", "#E37B22"], core: ["#FFF3C9", "#FFD36B"], glow: "rgb(240 160 50 / .28)", label: "Lit" },
  bright: { outer: ["#F8C04A", "#E5612A"], core: ["#FFF6D8", "#FFC45A"], glow: "rgb(240 130 40 / .35)", label: "One week or more" },
  blaze: { outer: ["#F39A2E", "#C73A2E"], core: ["#FFF0C4", "#FFB347"], glow: "rgb(220 80 40 / .38)", label: "One month or more" },
  radiant: { outer: ["#8DB4FF", "#3655C9"], core: ["#FFFFFF", "#CFE0FF"], glow: "rgb(90 130 255 / .4)", label: "100 days or more" },
};

/**
 * QEVRANT streak flame: a drawn, two-layer flame (not an emoji or a character). It sways gently
 * when lit, rests when the day isn't done yet, and ignites when the streak is extended.
 */
export function Flame({ tier, lit, size = 40, igniting = false, className }: { tier: FlameTier; lit: boolean; size?: number; igniting?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TIERS[lit ? tier : "ember"];
  return (
    <span className={clsx("flame relative inline-grid place-items-center", lit && "is-lit", igniting && "is-igniting", className)} style={{ width: size, height: size * 1.15 }} aria-hidden="true">
      {lit && <span className="flame-glow absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${t.glow}, transparent)` }} />}
      <svg viewBox="0 0 48 56" width={size} height={size * 1.15} className="relative overflow-visible">
        <defs>
          <linearGradient id={`o${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.outer[0]} /><stop offset="1" stopColor={t.outer[1]} /></linearGradient>
          <linearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.core[0]} /><stop offset="1" stopColor={t.core[1]} /></linearGradient>
        </defs>
        <g className="flame-outer">
          <path d="M24 2C27 12 38 18.5 38 33.5 38 45.5 31.6 53.5 24 53.5S10 45.5 10 34.5C10 27.5 13.4 22.5 17 19.2 17 25 19.4 28.2 22 29.2 20.2 20.4 21 10.4 24 2Z" fill={`url(#o${id})`} />
        </g>
        <g className="flame-core">
          <path d="M24.2 27C26.6 32.6 31 35.4 31 41.6 31 46.8 27.9 50.2 24 50.2S17 46.9 17 42.2C17 37.9 19.8 35.4 21.4 32.4 22 35.3 23 36.8 24.6 37.4 23.6 33.6 23.4 30.2 24.2 27Z" fill={`url(#c${id})`} />
        </g>
      </svg>
    </span>
  );
}

/** Flame with today's goal as a ring around it. */
export function FlameGoal({ s, size = 64, igniting }: { s: StreakState; size?: number; igniting?: boolean }) {
  const stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const p = Math.min(1, s.today / s.goal);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.goalMet ? "var(--success)" : "var(--accent)"} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1), stroke .3s" }} />
      </svg>
      <Flame tier={s.tier} lit={s.studiedToday} size={size * 0.5} igniting={igniting} />
    </span>
  );
}

/** Compact header indicator. */
export function StreakChip({ s }: { s: StreakState | null }) {
  if (!s) return null;
  const label = `Study streak: ${s.streak} ${s.streak === 1 ? "day" : "days"}${s.atRisk ? ", study today to keep it" : ""}. Today's goal: ${Math.min(s.today, s.goal)} of ${s.goal} activities.`;
  return (
    <Link href="/dashboard#streak" aria-label={label} title={label} data-testid="streak-chip"
      className={clsx("streak-chip flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold tabular-nums transition-[border-color,box-shadow,background]",
        s.studiedToday ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-surface" : "border-line bg-surface text-muted", "hover:shadow-[var(--shadow-lift)]")}>
      <Flame tier={s.tier} lit={s.studiedToday} size={18} />
      <span>{s.streak}</span>
      <span className="ml-0.5 hidden h-1.5 w-8 overflow-hidden rounded-full bg-surface-2 sm:block" aria-hidden="true">
        <span className={clsx("block h-full rounded-full transition-[width] duration-700", s.goalMet ? "bg-success" : "bg-accent")} style={{ width: `${Math.min(100, (s.today / s.goal) * 100)}%` }} />
      </span>
    </Link>
  );
}

export const TIER_LABEL = Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.label])) as Record<FlameTier, string>;
