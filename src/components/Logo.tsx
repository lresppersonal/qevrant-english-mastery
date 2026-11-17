import { BRAND } from "@/lib/brand";

/**
 * QEVRANT symbol: a geometric Q whose tail is drawn as the leg of an R. The ring opens where the
 * amber stroke passes through, so the two letters read as one mark. Source of truth for the
 * exported files: scripts/brand/build-brand.py (public/brand/*).
 */
export function BrandSymbol({ className = "h-8 w-8", tile = false }: { className?: string; tile?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {tile && <rect width="64" height="64" rx="15" fill="var(--logo-tile)" />}
      <path d="M39.01 45.38A16 16 0 1 1 46.38 38.01" fill="none" stroke={tile ? "var(--logo-on-tile)" : "var(--logo-ring)"} strokeWidth="6.4" strokeLinecap="round" />
      <path d="M34.04 33.04L49.88 48.88" stroke="var(--logo-tail)" strokeWidth="6.4" strokeLinecap="round" className="logo-tail" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo inline-flex items-center gap-2">
      <BrandSymbol className="h-9 w-9 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[17px] font-extrabold tracking-[0.07em] text-ink">{BRAND.company}</span>
          <span className="mt-1 text-[10.5px] font-semibold tracking-[0.06em] text-muted">{BRAND.product}</span>
        </span>
      )}
    </span>
  );
}
