"use client";
import Link from "next/link";
import { useId } from "react";
import clsx from "clsx";
import type { FlameTier, StreakState } from "@/lib/streak";

/**
 * Gradient stops per tier. The progression is deliberately gradual: a pale, quiet flame for the first
 * days, warming through the brand amber to a deep, saturated flame for long streaks. Only the longest
 * streaks get a soft halo.
 */
const TIERS: Record<FlameTier, { outer: [string, string]; core: string; glow: string | null; label: string }> = {
  ember: { outer: ["var(--flame-off-a)", "var(--flame-off-b)"], core: "var(--flame-off-core)", glow: null, label: "Not lit today" },
  spark: { outer: ["#F3D9A4", "#E9BF72"], core: "#FFF7E6", glow: null, label: "Getting started" },
  warm: { outer: ["#F2C76E", "#E0A33A"], core: "#FFF1D2", glow: null, label: "Building momentum" },
  bright: { outer: ["#F4B54A", "#E3842A"], core: "#FFE9B8", glow: null, label: "One week or more" },
  vivid: { outer: ["#F5A23C", "#D9611F"], core: "#FFDF9E", glow: "rgb(230 120 40 / .22)", label: "Two weeks or more" },
  deep: { outer: ["#EE8A2C", "#B8361C"], core: "#FFD27A", glow: "rgb(200 70 30 / .26)", label: "One month or more" },
  radiant: { outer: ["#E9A23B", "#9E2A17"], core: "#FFE7A6", glow: "rgb(224 163 58 / .32)", label: "100 days or more" },
};

/**
 * QEVRANT streak flame: one clean drawn shape with a small inner light, in the brand's amber family
 * (not an emoji or a character). It is still by default; only a soft halo breathes on long streaks,
 * and it ignites briefly when the day's first completed activity extends the streak.
 */
export function Flame({ tier, lit, size = 40, igniting = false, className }: { tier: FlameTier; lit: boolean; size?: number; igniting?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TIERS[lit ? tier : "ember"];
  return (
    <span className={clsx("flame relative inline-grid place-items-center", lit && "is-lit", lit && t.glow && "has-glow", igniting && "is-igniting", className)} style={{ width: size, height: size * 1.15 }} aria-hidden="true">
      {lit && t.glow && <span className="flame-glow absolute inset-0 rounded-full" style={{ background: `radial-gradient(closest-side, ${t.glow}, transparent)` }} />}
      <svg viewBox="0 0 48 56" width={size} height={size * 1.15} className="relative overflow-visible">
        <defs><linearGradient id={`o${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.outer[0]} /><stop offset="1" stopColor={t.outer[1]} /></linearGradient></defs>
        <path className="flame-outer" d="M24 3C30 13 39 21 39 33C39 44 32 52 24 52C16 52 9 44 9 33C9 25.5 13.5 19.5 18 15.5C18 22 20.8 25.6 24 26.8C22 19 21.2 11 24 3Z" fill={`url(#o${id})`} />
        <path className="flame-core" d="M24 33C27 37.5 30 40 30 43.6C30 47.2 27.3 49.6 24 49.6C20.7 49.6 18 47.2 18 43.6C18 40 21 37.5 24 33Z" fill={t.core} opacity={lit ? 0.95 : 0.7} />
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
