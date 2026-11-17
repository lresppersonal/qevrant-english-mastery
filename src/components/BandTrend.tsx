"use client";
import { useState } from "react";

/** Single-series line of estimated bands over time (0–9 scale shown as 4–9). Hover/focus a point for its value; a table is provided for screen readers. */
export function BandTrend({ points, label }: { points: { date: string; band: number; title?: string }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return null;
  const W = 560, H = 160, padL = 30, padR = 16, padT = 14, padB = 26;
  const lo = Math.max(0, Math.floor(Math.min(...points.map((p) => p.band)) - 1)), hi = Math.min(9, Math.ceil(Math.max(...points.map((p) => p.band)) + 0.5));
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (b: number) => padT + ((hi - b) * (H - padT - padB)) / Math.max(1, hi - lo);
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const h = hover ?? points.length - 1;
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}: from ${points[0].band} to ${points[points.length - 1].band}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} strokeDasharray={t === lo ? undefined : "2 4"} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">{t}</text>
          </g>
        ))}
        <polyline fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={points.map((p, i) => `${x(i)},${y(p.band)}`).join(" ")} />
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${fmt(p.date)}: band ${p.band}`} className="outline-none">
            <circle cx={x(i)} cy={y(p.band)} r={14} fill="transparent" />
            <circle cx={x(i)} cy={y(p.band)} r={i === h ? 5.5 : 4} fill="var(--primary)" stroke="var(--surface)" strokeWidth={2} />
          </g>
        ))}
        <text x={padL} y={H - 6} fontSize={11} fill="var(--muted)">{fmt(points[0].date)}</text>
        <text x={W - padR} y={H - 6} fontSize={11} fill="var(--muted)" textAnchor="end">{fmt(points[points.length - 1].date)}</text>
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm"
        style={{ left: `${(x(h) / W) * 100}%`, top: `${(y(points[h].band) / H) * 100}%`, transform: `translate(${h === points.length - 1 ? "-100%" : h === 0 ? "0" : "-50%"}, calc(-100% - 10px))` }}>
        <span className="font-semibold">Band {points[h].band}</span> <span className="text-muted">· {fmt(points[h].date)}{points[h].title ? ` · ${points[h].title}` : ""}</span>
      </div>
      <table className="sr-only"><caption>{label}</caption><thead><tr><th>Date</th><th>Band</th></tr></thead>
        <tbody>{points.map((p, i) => <tr key={i}><td>{fmt(p.date)}</td><td>{p.band}</td></tr>)}</tbody></table>
    </figure>
  );
}
