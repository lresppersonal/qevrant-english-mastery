"use client";
import { useState } from "react";
import clsx from "clsx";
import { SKILLS, SKILL_LABEL, type Skill } from "@/lib/plan/personal";
import { heatLevel, HEAT_LABEL, monthGrid, dayKeyLocal } from "@/lib/study-time";

const COLOR: Record<Skill, string> = { grammar: "var(--viz-1)", vocabulary: "var(--viz-2)", reading: "var(--viz-3)", listening: "var(--viz-4)", speaking: "var(--viz-5)", writing: "var(--viz-6)" };

/** Share of completed material across the six areas. Every slice is labelled with its count and share. */
export function CompletedDoughnut({ counts }: { counts: Record<Skill, number> }) {
  const total = SKILLS.reduce((n, s) => n + counts[s], 0);
  const [hover, setHover] = useState<Skill | null>(null);
  if (total === 0) return <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted" data-testid="doughnut-empty">Nothing completed yet. Finish an exercise, a text, a listening log, a speaking answer or an essay and it appears here.</p>;
  const R = 42, C = 2 * Math.PI * R, GAP = total > 1 ? 1.2 : 0;
  let off = 0;
  const arcs = SKILLS.filter((s) => counts[s] > 0).map((s) => { const len = (counts[s] / total) * C; const a = { s, len: Math.max(0.5, len - GAP), off }; off += len; return a; });
  const focus = hover ?? null;
  return (
    <div className="flex flex-wrap items-center gap-6" data-testid="completed-doughnut">
      <svg viewBox="0 0 100 100" className="h-44 w-44 shrink-0 -rotate-90" role="img" aria-label={`Completed material: ${SKILLS.map((s) => `${SKILL_LABEL[s]} ${counts[s]}`).join(", ")}`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        {arcs.map((a) => (
          <circle key={a.s} cx="50" cy="50" r={R} fill="none" stroke={COLOR[a.s]} strokeWidth={focus === a.s ? 14 : 12}
            strokeDasharray={`${a.len} ${C - a.len}`} strokeDashoffset={-a.off} className="cursor-pointer transition-[stroke-width] duration-150"
            onMouseEnter={() => setHover(a.s)} onMouseLeave={() => setHover(null)}><title>{`${SKILL_LABEL[a.s]}: ${counts[a.s]} (${Math.round((counts[a.s] / total) * 100)}%)`}</title></circle>
        ))}
        <g className="rotate-90" style={{ transformOrigin: "50px 50px" }}>
          <text x="50" y="48" textAnchor="middle" className="fill-[var(--text)] font-display text-[15px] font-extrabold">{focus ? counts[focus] : total}</text>
          <text x="50" y="60" textAnchor="middle" className="fill-[var(--muted)] text-[6.5px]">{focus ? SKILL_LABEL[focus] : "completed"}</text>
        </g>
      </svg>
      <ul className="grid min-w-[14rem] flex-1 gap-1.5 text-sm">
        {SKILLS.map((s) => (
          <li key={s} className={clsx("flex items-center gap-2 rounded-md px-1.5 py-0.5", hover === s && "bg-surface-2")} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLOR[s] }} aria-hidden="true" />
            <span className="flex-1">{SKILL_LABEL[s]}</span>
            <span className="tabular-nums font-semibold">{counts[s]}</span>
            <span className="w-10 text-right tabular-nums text-muted">{Math.round((counts[s] / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Active minutes per day for the last 14 days; hover or focus a bar for the exact figure. */
export function StudyTimeBars({ minutes, days = 14 }: { minutes: Map<string, number>; days?: number }) {
  const today = new Date();
  const rows = Array.from({ length: days }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - (days - 1 - i)); return { d, m: minutes.get(dayKeyLocal(d)) ?? 0 }; });
  const max = Math.max(30, ...rows.map((r) => r.m));
  const total = rows.reduce((n, r) => n + r.m, 0);
  const [tip, setTip] = useState<number | null>(null);
  if (total === 0) return <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted" data-testid="study-time-empty">No measured study time in the last {days} days.</p>;
  return (
    <figure data-testid="study-time">
      <div className="relative flex h-36 items-end gap-1 border-b border-line">
        {rows.map((r, i) => (
          <button key={i} type="button" className="group relative flex h-full flex-1 items-end justify-center outline-none" onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(i)} onBlur={() => setTip(null)}
            aria-label={`${r.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ${r.m} minutes`}>
            <span className="w-full max-w-6 rounded-t bg-primary transition-opacity group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-[var(--focus)]" style={{ height: r.m ? `${Math.max(3, (r.m / max) * 100)}%` : "0" }} />
            {tip === i && <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs shadow">{r.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · <strong>{r.m} min</strong></span>}
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-1">{rows.map((r, i) => <span key={i} className="flex-1 text-center text-[10px] text-muted">{i % 2 === 1 || days <= 7 ? r.d.getDate() : ""}</span>)}</div>
      <figcaption className="mt-2 text-xs text-muted">{total} active minutes in {days} days. Measured from timed exercises, listening logs and speaking recordings; reading and writing are not timed yet.</figcaption>
    </figure>
  );
}

const HEAT_BG = ["var(--surface-2)", "var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)", "var(--heat-5)"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** Study days as Monday-first monthly calendars, shaded by active minutes. */
export function StudyHeatmap({ minutes, months = 3 }: { minutes: Map<string, number>; months?: number }) {
  const now = new Date();
  const list = Array.from({ length: months }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1));
  const [tip, setTip] = useState<string | null>(null);
  return (
    <div data-testid="study-heatmap">
      <div className="flex flex-wrap gap-6">
        {list.map((m) => (
          <figure key={m.toISOString()}>
            <figcaption className="mb-1.5 text-sm font-semibold">{m.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</figcaption>
            <table className="border-separate border-spacing-1" role="grid">
              <thead><tr>{DOW.map((d, i) => <th key={i} scope="col" className="text-[10px] font-medium text-muted"><abbr title={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]} className="no-underline">{d}</abbr></th>)}</tr></thead>
              <tbody>
                {monthGrid(m.getFullYear(), m.getMonth()).map((wk, w) => (
                  <tr key={w}>{wk.map((d, i) => {
                    if (!d) return <td key={i} className="h-5 w-5" />;
                    const k = dayKeyLocal(d); const min = minutes.get(k) ?? 0; const lv = heatLevel(min); const future = d > now;
                    const label = `${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}: ${future ? "upcoming" : `${min} active minutes (${HEAT_LABEL[lv]})`}`;
                    return (
                      <td key={i} className="relative h-5 w-5 p-0">
                        <span tabIndex={future ? -1 : 0} aria-label={label} onMouseEnter={() => setTip(k)} onMouseLeave={() => setTip(null)} onFocus={() => setTip(k)} onBlur={() => setTip(null)}
                          className={clsx("block h-5 w-5 rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]", future && "opacity-30", d.toDateString() === now.toDateString() && "ring-1 ring-[var(--text)]")}
                          style={{ background: HEAT_BG[future ? 0 : lv] }} />
                        {tip === k && !future && <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs shadow">{d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · <strong>{min} min</strong></span>}
                      </td>
                    );
                  })}</tr>
                ))}
              </tbody>
            </table>
          </figure>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted" aria-label="Legend">
        {HEAT_LABEL.map((l, i) => <li key={l} className="flex items-center gap-1"><span className="h-3 w-3 rounded-[3px] border border-line" style={{ background: HEAT_BG[i] }} aria-hidden="true" />{l}</li>)}
      </ul>
    </div>
  );
}
