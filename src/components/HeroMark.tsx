/**
 * The QEVRANT symbol, large and animated, for the landing hero. Same geometry and colours as the
 * logo (src/components/Logo.tsx). Each 16-second cycle: the symbol rests as the exact logo, the ring
 * makes one slow, eased turn, the amber stroke draws back slightly while it turns, then extends again
 * as the ring's opening returns to it, so the Q "locks" together. CSS only; still with reduced motion.
 */
export function HeroMark() {
  return (
    <svg viewBox="0 0 64 64" className="hero-mark h-full w-full overflow-visible" aria-hidden="true" data-testid="hero-mark">
      <path className="hero-ring" d="M39.01 45.38A16 16 0 1 1 46.38 38.01" fill="none" stroke="var(--logo-ring)" strokeWidth="6.4" strokeLinecap="round" />
      <path className="hero-tail" d="M34.04 33.04L49.88 48.88" stroke="var(--logo-tail)" strokeWidth="6.4" strokeLinecap="round" />
    </svg>
  );
}
