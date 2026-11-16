import { BRAND } from "@/lib/brand";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-[var(--text)]" />
        <path d="M18 46V18h22M18 32h16M18 46h22" fill="none" className="stroke-[var(--bg)]" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="46" cy="46" r="4" className="fill-[var(--accent)]" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-tight">{BRAND.product}</span>
          <span className="mt-0.5 text-[10px] font-semibold tracking-[0.18em] text-muted">BY {BRAND.company}</span>
        </span>
      )}
    </span>
  );
}
