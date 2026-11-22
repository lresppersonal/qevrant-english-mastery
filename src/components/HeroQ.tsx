/**
 * The landing hero's large QEVRANT symbol, cropped by the left edge of the page so that roughly half
 * of the Q is visible and its amber tail crosses the composition. Exact logo geometry and colours.
 *
 * Motion (CSS only, see globals.css "Landing hero Q"):
 * 1. on load the ring draws itself in one sweep, then the tail slides in along its own 45° line;
 * 2. afterwards the whole Q turns slowly back and forth around its centre (which sits off-screen, top
 *    left), so the visible arc sweeps smoothly; the tail draws back and locks, and a soft light runs along it.
 * With reduced motion the symbol is shown still.
 */
export function HeroQ() {
  return (
    <svg viewBox="0 0 64 64" className="hero-q pointer-events-none" aria-hidden="true" data-testid="hero-mark">
      <defs>
        <linearGradient id="hq-glint" gradientUnits="userSpaceOnUse" x1="34" y1="33" x2="50" y2="49">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="hq-spin">
      <g>
        <path className="hq-ring" pathLength={100} d="M39.01 45.38A16 16 0 1 1 46.38 38.01" fill="none" stroke="var(--logo-ring)" strokeWidth="6.4" strokeLinecap="round" />
      </g>
      <g className="hq-tail-in">
        <path className="hq-tail" d="M34.04 33.04L49.88 48.88" stroke="var(--logo-tail)" strokeWidth="6.4" strokeLinecap="round" />
        <path className="hq-glint" pathLength={100} d="M34.04 33.04L49.88 48.88" stroke="url(#hq-glint)" strokeWidth="3.2" strokeLinecap="round" />
      </g>
      </g>
    </svg>
  );
}
