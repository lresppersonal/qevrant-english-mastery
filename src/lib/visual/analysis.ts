import type { Figure, Series } from "./types";

/**
 * Key features computed from the data itself (never written by hand), so the guidance shown to the
 * learner and the facts given to the AI always match the figure.
 */
const fmt = (v: number, unit: string) => {
  const n = Number.isInteger(v) ? v.toLocaleString("en-GB") : v.toLocaleString("en-GB", { maximumFractionDigits: 2 });
  if (!unit) return n;
  if (unit === "%") return `${n}%`;
  if (unit === "°C") return `${n}°C`;
  return `${n} ${unit}`;
};
const pctChange = (a: number, b: number) => (a === 0 ? null : Math.round(((b - a) / a) * 100));
const describeChange = (a: number, b: number) => {
  const p = pctChange(a, b);
  if (b === a) return "stayed the same";
  if (p === null) return b > a ? "rose from zero" : "fell";
  const word = b > a ? (p >= 100 ? `more than ${p >= 200 ? "tripled" : "doubled"}` : p >= 40 ? "rose sharply" : p >= 10 ? "rose" : "rose slightly") : (p <= -50 ? "fell by more than half" : p <= -20 ? "fell considerably" : "fell slightly");
  return word;
};
const maxBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, b) => (f(b) > f(a) ? b : a));
const minBy = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, b) => (f(b) < f(a) ? b : a));

function seriesFeatures(series: Series[], x: string[], unit: string): string[] {
  const out: string[] = [];
  const last = x.length - 1;
  for (const s of series) {
    const peakI = s.values.indexOf(Math.max(...s.values)), lowI = s.values.indexOf(Math.min(...s.values));
    let line = `${s.name}: ${fmt(s.values[0], unit)} in ${x[0]} → ${fmt(s.values[last], unit)} in ${x[last]} (${describeChange(s.values[0], s.values[last])})`;
    if (peakI !== 0 && peakI !== last) line += `; peak of ${fmt(s.values[peakI], unit)} in ${x[peakI]}`;
    if (lowI !== 0 && lowI !== last) line += `; low of ${fmt(s.values[lowI], unit)} in ${x[lowI]}`;
    out.push(line + ".");
  }
  if (series.length > 1) {
    const top0 = maxBy(series, (s) => s.values[0]), topN = maxBy(series, (s) => s.values[last]);
    out.push(top0 === topN ? `${topN.name} was the highest at both the start and the end.` : `${top0.name} was highest in ${x[0]}, but ${topN.name} was highest by ${x[last]}.`);
    const lowN = minBy(series, (s) => s.values[last]);
    out.push(`${lowN.name} ended the period with the lowest figure (${fmt(lowN.values[last], unit)}).`);
    const biggest = maxBy(series, (s) => Math.abs(s.values[last] - s.values[0]));
    out.push(`The largest overall change was in ${biggest.name} (${fmt(Math.round((biggest.values[last] - biggest.values[0]) * 100) / 100, unit)}).`);
    // crossovers between pairs
    for (let a = 0; a < series.length; a++) for (let b = a + 1; b < series.length; b++) {
      for (let i = 1; i <= last; i++) {
        const d0 = series[a].values[i - 1] - series[b].values[i - 1], d1 = series[a].values[i] - series[b].values[i];
        if (d0 !== 0 && d1 !== 0 && Math.sign(d0) !== Math.sign(d1)) { out.push(`${series[a].name} and ${series[b].name} swapped positions between ${x[i - 1]} and ${x[i]}.`); break; }
      }
    }
  }
  return out;
}

export function keyFeaturesFor(f: Figure): string[] {
  if (f.kind === "line") return ["Overview: identify the overall trend of each line and the most striking contrast.", ...seriesFeatures(f.series, f.x, f.unit)];
  if (f.kind === "bar") {
    const out = ["Overview: say which category or group is highest overall and what the main difference between the groups is."];
    for (const s of f.series) {
      const hi = s.values.indexOf(Math.max(...s.values)), lo = s.values.indexOf(Math.min(...s.values));
      out.push(`${s.name}: highest for ${f.x[hi]} (${fmt(s.values[hi], f.unit)}), lowest for ${f.x[lo]} (${fmt(s.values[lo], f.unit)}).`);
    }
    if (f.series.length >= 2) {
      const [a, b] = [f.series[0], f.series[f.series.length - 1]];
      const gaps = f.x.map((c, i) => ({ c, d: b.values[i] - a.values[i] }));
      const big = maxBy(gaps, (g) => Math.abs(g.d));
      out.push(`The biggest difference between ${a.name} and ${b.name} is for ${big.c} (${fmt(Math.abs(Math.round(big.d * 10) / 10), f.unit)}).`);
      const higher = gaps.filter((g) => g.d > 0).length;
      out.push(higher === gaps.length ? `${b.name} is higher than ${a.name} in every category.` : higher === 0 ? `${a.name} is higher than ${b.name} in every category.` : `${b.name} is higher in ${higher} of ${gaps.length} categories.`);
    }
    return out;
  }
  if (f.kind === "pie") {
    const sorted = [...f.slices].sort((a, b) => b.value - a.value);
    return [`${f.title}: the largest share is ${sorted[0].name} (${sorted[0].value}%), followed by ${sorted[1].name} (${sorted[1].value}%); the smallest is ${sorted[sorted.length - 1].name} (${sorted[sorted.length - 1].value}%).`];
  }
  if (f.kind === "table") {
    const out = ["Overview: find the highest and lowest figures and any clear pattern across rows or columns. Do not describe every number."];
    f.columns.forEach((col, ci) => {
      const hi = maxBy(f.rows, (r) => r.values[ci]), lo = minBy(f.rows, (r) => r.values[ci]);
      out.push(`${col}: highest ${hi.name} (${fmt(hi.values[ci], f.unit)}), lowest ${lo.name} (${fmt(lo.values[ci], f.unit)}).`);
    });
    if (f.columns.length >= 2 && /^\d{4}$|^Q\d$/.test(f.columns[0])) {
      const changes = f.rows.map((r) => ({ n: r.name, d: r.values[r.values.length - 1] - r.values[0] }));
      const up = maxBy(changes, (c) => c.d), down = minBy(changes, (c) => c.d);
      out.push(`Largest increase: ${up.n}; ${down.d < 0 ? `largest decrease: ${down.n}` : `smallest increase: ${down.n}`}.`);
    }
    return out;
  }
  if (f.kind === "flow") {
    const n = f.nodes.length;
    if (f.layout === "cycle") return [`The cycle has ${n} stages and returns to its starting point (${f.nodes[0].label}).`, "Overview: say how many stages there are and what the cycle as a whole achieves.", "Describe the stages in order, using sequencers and passive forms where natural."];
    return [`The diagram has ${n} labelled ${f.layout === "schematic" ? "parts or stages" : "stages"}, beginning with "${f.nodes[0].label}" and ending with "${f.nodes[n - 1].label}".`, "Overview: state the purpose of the process or device and the main phases.", "Group the steps into phases rather than listing each one with the same sentence pattern."];
  }
  if (f.kind === "map" || f.kind === "plan") {
    const [a, b] = f.panels;
    if (!b) return [];
    const names = (p: typeof a) => new Set((f.kind === "map" ? (p as { features: { label?: string }[] }).features.map((x) => x.label) : (p as { rooms: { label: string }[] }).rooms.map((x) => x.label)).filter(Boolean) as string[]);
    const A = names(a), B = names(b);
    const added = [...B].filter((x) => !A.has(x)), removed = [...A].filter((x) => !B.has(x)), kept = [...A].filter((x) => B.has(x));
    return [
      `Overview: summarise the overall transformation from "${a.caption}" to "${b.caption}".`,
      added.length ? `New: ${added.join(", ")}.` : "No new features were added.",
      removed.length ? `Removed or replaced: ${removed.join(", ")}.` : "Nothing was removed.",
      kept.length ? `Unchanged: ${kept.slice(0, 6).join(", ")}${kept.length > 6 ? "…" : ""}.` : "",
      "Use location language (to the north of, adjacent to, in place of) and passive forms (was demolished, has been converted).",
    ].filter(Boolean);
  }
  return [];
}

/** Plain-text data for the AI assessor. */
export function factsFor(f: Figure): string {
  if (f.kind === "line" || f.kind === "bar") return `${f.kind.toUpperCase()} "${f.title}" (${f.yLabel}; x = ${f.xLabel})\n` + f.series.map((s) => `${s.name}: ${s.values.map((v, i) => `${f.x[i]}=${v}`).join(", ")}`).join("\n");
  if (f.kind === "pie") return `PIE "${f.title}" (%): ${f.slices.map((s) => `${s.name}=${s.value}`).join(", ")}`;
  if (f.kind === "table") return `TABLE "${f.title}" (${f.rowHeader} × ${f.columns.join(" | ")})\n` + f.rows.map((r) => `${r.name}: ${r.values.join(" | ")}`).join("\n");
  if (f.kind === "flow") return `DIAGRAM "${f.title}" (${f.layout})\n` + f.nodes.map((n, i) => `${i + 1}. ${n.label}${n.note ? ` — ${n.note}` : ""}`).join("\n") + (f.edges.length ? `\nConnections: ${f.edges.map((e) => `${e.from}→${e.to}${e.label ? ` (${e.label})` : ""}`).join("; ")}` : "") + (f.note ? `\nNote: ${f.note}` : "");
  if (f.kind === "map") return `MAPS "${f.title}"\n` + f.panels.map((p) => `${p.caption}: ${p.features.filter((x) => x.label).map((x) => `${x.label} (${x.type}${x.rect ? ` at x${x.rect[0]},y${x.rect[1]}` : ""})`).join("; ")}`).join("\n") + "\n(North is at the top. x increases to the east, y to the south.)";
  if (f.kind === "plan") return `PLANS "${f.title}"\n` + f.panels.map((p) => `${p.caption}: ${p.rooms.map((r) => `${r.label} (x${r.x},y${r.y},${r.w}×${r.h})`).join("; ")}`).join("\n") + "\n(The top of the plan is north/rear. x increases to the right.)";
  return "";
}
