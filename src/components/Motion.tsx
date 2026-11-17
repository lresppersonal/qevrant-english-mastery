"use client";
import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Counts up to a number once it scrolls into view (instant for reduced motion). */
export function CountUp({ value, suffix = "", duration = 700 }: { value: number; suffix?: string; duration?: number }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  useEffect(() => {
    if (reduced()) { setShown(value); return; }
    let raf = 0;
    const run = () => {
      const start = performance.now(); const a = from.current;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(a + (value - a) * eased));
        if (p < 1) raf = requestAnimationFrame(step); else from.current = value;
      };
      raf = requestAnimationFrame(step);
    };
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); run(); } });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className="tabular-nums"><span aria-hidden="true">{shown}{suffix}</span><span className="sr-only">{value}{suffix}</span></span>;
}

/** Circular progress ring that animates to its value. */
export function Ring({ value, size = 88, stroke = 8, label, children }: { value: number; size?: number; stroke?: number; label: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const [p, setP] = useState(reduced() ? pct : 0);
  useEffect(() => { const t = setTimeout(() => setP(pct), 60); return () => clearTimeout(t); }, [pct]);
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
