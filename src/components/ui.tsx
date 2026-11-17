import Link from "next/link";
import clsx from "clsx";
import type { Block } from "@/lib/content/schema";
import { Lightbulb, TriangleAlert, Scale, BookMarked, ChevronDown } from "lucide-react";

const LEVEL_STYLE: Record<string, string> = {
  B2: "border-[color-mix(in_srgb,var(--primary)_35%,transparent)] text-primary",
  "B2+": "border-[color-mix(in_srgb,var(--primary)_55%,transparent)] text-primary",
  C1: "border-[color-mix(in_srgb,var(--accent)_70%,transparent)] text-accent-text",
  C2: "border-accent bg-accent text-accent-fg",
};

export function LevelBadge({ level, className }: { level: string; className?: string }) {
  return <span className={clsx("chip shrink-0 !font-bold", LEVEL_STYLE[level], className)} aria-label={`Level ${level}`}>{level}</span>;
}

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-8 enter">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{title}</h1>
        {children}
      </div>
      {intro && <div className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted">{intro}</div>}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      <div className="mt-2 max-w-md text-muted">{body}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ComingSoon({ title, phase, what }: { title: string; phase: string; what: string[] }) {
  return (
    <>
      <PageHeader eyebrow={phase} title={title} intro="This area isn't built yet. Nothing on this page pretends otherwise." />
      <div className="card p-6">
        <p className="font-semibold">What's planned</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">{what.map((w) => <li key={w}>{w}</li>)}</ul>
        <Link href="/topics/education" className="btn btn-primary mt-6">Study the Education topic meanwhile</Link>
      </div>
    </>
  );
}

/** Inline markup used in content JSON: **bold**, *italic* (may contain **bold**), ~~struck-out (incorrect)~~. */
const INLINE = /(~~[^~]+~~|\*\*[^*]+\*\*|\*(?=\*\*|[^*])(?:\*\*[^*]+\*\*|[^*])+\*(?!\*))/g;
export function Rich({ text }: { text: string }) {
  const parts = text.split(INLINE).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("~~")) return <s key={i} className="decoration-danger decoration-2"><span className="sr-only">Incorrect: </span>{p.slice(2, -2)}</s>;
        if (p.startsWith("**") && p.endsWith("**") && !p.slice(2, -2).includes("*")) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith("*") && p.endsWith("*")) return <em key={i}><Rich text={p.slice(1, -1)} /></em>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

const NOTE = {
  tip: { icon: Lightbulb, label: "Tip", cls: "border-primary/30 bg-primary-soft" },
  warning: { icon: TriangleAlert, label: "Watch out", cls: "border-accent/60 bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]" },
  register: { icon: Scale, label: "Register", cls: "border-line bg-surface-2" },
} as const;

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[16.5px] leading-[1.7]">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p": return <p key={i}><Rich text={b.text} /></p>;
          case "h3": return <h3 key={i} className="pt-2 text-lg font-bold text-ink"><Rich text={b.text} /></h3>;
          case "rule":
            return (
              <div key={i} className="flex gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3">
                <BookMarked size={18} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                <p><strong className="text-primary">Rule: </strong><Rich text={b.text} /></p>
              </div>
            );
          case "details":
            return (
              <details key={i} className="group rounded-xl border border-line bg-surface">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 font-semibold [&::-webkit-details-marker]:hidden">
                  <span><Rich text={b.title} /></span>
                  <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-line px-4 py-4"><Blocks blocks={b.blocks} /></div>
              </details>
            );
          case "list": return <ul key={i} className="list-disc space-y-1.5 pl-5">{b.items.map((t, j) => <li key={j}><Rich text={t} /></li>)}</ul>;
          case "examples":
            return (
              <ul key={i} className="space-y-2">
                {b.items.map((ex, j) => (
                  <li key={j} className={clsx("rounded-xl border-l-4 bg-surface-2 px-4 py-3", ex.wrong ? "border-danger" : "border-primary")}>
                    <p className="font-medium"><Rich text={ex.en} /></p>
                    {ex.note && <p className="mt-1 text-[15px] text-muted"><Rich text={ex.note} /></p>}
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-[15px]">
                  <thead className="bg-surface-2"><tr>{b.head.map((h) => <th key={h} scope="col" className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j} className="border-t border-line">{r.map((c, k) => <td key={k} className="px-4 py-2.5 align-top"><Rich text={c} /></td>)}</tr>)}</tbody>
                </table>
              </div>
            );
          case "note": {
            const n = NOTE[b.tone];
            return (
              <aside key={i} className={clsx("flex gap-3 rounded-xl border px-4 py-3", n.cls)}>
                <n.icon size={18} className="mt-1 shrink-0" aria-hidden="true" />
                <p><strong>{n.label}: </strong><Rich text={b.text} /></p>
              </aside>
            );
          }
        }
      })}
    </div>
  );
}

export function StatCard({ label, value, hint, index = 0 }: { label: string; value: React.ReactNode; hint?: React.ReactNode; index?: number }) {
  return (
    <div className="card enter p-5" style={{ ["--i" as string]: index }}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${pct}%` }} />
    </div>
  );
}
