import { tokens, contrastPairs } from "../src/lib/tokens";

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function ratio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

let failed = 0;
for (const theme of ["light", "dark"] as const) {
  const t = tokens[theme];
  for (const p of contrastPairs) {
    const r = ratio(t[p.fg], t[p.bg]);
    const ok = r >= p.min;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${theme.padEnd(5)} ${p.fg} on ${p.bg}: ${r.toFixed(2)} (min ${p.min})`);
  }
}
if (failed) {
  console.error(`${failed} pair(s) below threshold`);
  process.exit(1);
}
