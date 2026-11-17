"use client";
import { useId, useState } from "react";
import type { Figure, FlowNode, MapFeature } from "@/lib/visual";

/** Draws a task figure from its data. Colours come from CSS variables (light/dark), every chart has a data-table view. */
export function VisualFigure({ figure }: { figure: Figure }) {
  return (
    <figure className="viz-root card overflow-hidden p-4 sm:p-5" data-testid="visual-figure">
      <figcaption className="mb-3 text-center font-display text-[15px] font-bold">{figure.title}</figcaption>
      {figure.kind === "line" && <LineChart f={figure} />}
      {figure.kind === "bar" && <BarChart f={figure} />}
      {figure.kind === "pie" && <PieChart f={figure} />}
      {figure.kind === "table" && <DataTable f={figure} />}
      {figure.kind === "flow" && (figure.layout === "linear" ? <LinearFlow f={figure} /> : figure.layout === "cycle" ? <CycleFlow f={figure} /> : <Schematic f={figure} />)}
      {figure.kind === "map" && <MapPanels f={figure} />}
      {figure.kind === "plan" && <PlanPanels f={figure} />}
      {(figure.kind === "line" || figure.kind === "bar" || figure.kind === "pie") && <DataView figure={figure} />}
    </figure>
  );
}

const S = (i: number) => `var(--series-${(i % 8) + 1})`;
const nice = (max: number) => { const p = 10 ** Math.floor(Math.log10(max || 1)); const m = max / p; const step = (m <= 1.5 ? 0.25 : m <= 3 ? 0.5 : m <= 6 ? 1 : 2) * p; return { top: Math.ceil(max / step) * step, step }; };
const fmt = (v: number) => (Number.isInteger(v) ? v.toLocaleString("en-GB") : v.toLocaleString("en-GB", { maximumFractionDigits: 2 }));

function Legend({ names }: { names: string[] }) {
  return (
    <ul className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
      {names.map((n, i) => <li key={n} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: S(i) }} aria-hidden="true" />{n}</li>)}
    </ul>
  );
}

function Axes({ W, H, pad, ticks, top, yLabel, x, xLabel }: { W: number; H: number; pad: { l: number; r: number; t: number; b: number }; ticks: number[]; top: number; yLabel: string; x: string[]; xLabel: string; }) {
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  return (
    <g fontSize="11" fill="var(--muted)">
      {ticks.map((t) => <g key={t}><line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "2 4"} /><text x={pad.l - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text></g>)}
      <text transform={`translate(12 ${(H - pad.b + pad.t) / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
      <text x={(W + pad.l - pad.r) / 2} y={H - 2} textAnchor="middle">{xLabel}</text>
      {x.length === 0 ? null : null}
    </g>
  );
}

function LineChart({ f }: { f: Extract<Figure, { kind: "line" }> }) {
  const W = 640, H = 330, pad = { l: 56, r: 92, t: 10, b: 44 };
  const { top, step } = nice(Math.max(...f.series.flatMap((s) => s.values)) * 1.05);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 1000) / 1000);
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / Math.max(1, f.x.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  // direct labels at line ends, nudged apart
  const ends = f.series.map((s, i) => ({ i, y: y(s.values[s.values.length - 1]) })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
  return (
    <>
      <Legend names={f.series.map((s) => s.name)} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${f.title}. Line graph of ${f.yLabel} by ${f.xLabel}.`}>
        <Axes W={W} H={H} pad={pad} ticks={ticks} top={top} yLabel={f.yLabel} x={f.x} xLabel={f.xLabel} />
        <g fontSize="11" fill="var(--muted)">{f.x.map((l, i) => (f.x.length <= 12 || i % 2 === 0) && <text key={l} x={x(i)} y={H - pad.b + 18} textAnchor="middle">{l}</text>)}</g>
        {f.series.map((s, k) => (
          <g key={s.name}>
            <polyline fill="none" stroke={S(k)} strokeWidth={2} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
            {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={S(k)} stroke="var(--surface)" strokeWidth={2}><title>{`${s.name}, ${f.x[i]}: ${fmt(v)} ${f.unit}`}</title></circle>)}
          </g>
        ))}
        {f.series.length <= 4 && ends.map((e) => <text key={e.i} x={W - pad.r + 8} y={e.y + 4} fontSize="11" fill="var(--text)">{f.series[e.i].name}</text>)}
      </svg>
    </>
  );
}

function BarChart({ f }: { f: Extract<Figure, { kind: "bar" }> }) {
  const W = 640, H = 330, pad = { l: 56, r: 12, t: 10, b: 56 };
  const { top, step } = nice(Math.max(...f.series.flatMap((s) => s.values)) * 1.08);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => Math.round(i * step * 1000) / 1000);
  const band = (W - pad.l - pad.r) / f.x.length, inner = band * 0.72, bw = inner / f.series.length;
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  return (
    <>
      <Legend names={f.series.map((s) => s.name)} />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${f.title}. Bar chart of ${f.yLabel} by ${f.xLabel}.`}>
        <Axes W={W} H={H} pad={pad} ticks={ticks} top={top} yLabel={f.yLabel} x={f.x} xLabel={f.xLabel} />
        {f.x.map((cat, ci) => (
          <g key={cat}>
            {f.series.map((s, si) => { const v = s.values[ci] ?? 0; const bx = pad.l + band * ci + (band - inner) / 2 + bw * si + 1; const h = Math.max(0, y(0) - y(v)); return (
              <path key={s.name} d={`M${bx},${y(0)} v${-Math.max(0, h - 4)} q0,-4 4,-4 h${Math.max(0, bw - 10)} q4,0 4,4 v${Math.max(0, h - 4)} z`} fill={S(si)}><title>{`${cat}, ${s.name}: ${fmt(v)} ${f.unit}`}</title></path>
            ); })}
            <text x={pad.l + band * ci + band / 2} y={H - pad.b + 16} fontSize="11" textAnchor="middle" fill="var(--muted)">{cat}</text>
          </g>
        ))}
      </svg>
    </>
  );
}

function PieChart({ f }: { f: Extract<Figure, { kind: "pie" }> }) {
  const W = 440, H = 300, cx = 150, cy = 150, r = 110;
  let a0 = -Math.PI / 2;
  const total = f.slices.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-md" role="img" aria-label={`${f.title}. Pie chart: ${f.slices.map((s) => `${s.name} ${s.value}%`).join(", ")}.`}>
      {f.slices.map((s, i) => {
        const a1 = a0 + (s.value / total) * 2 * Math.PI; const large = a1 - a0 > Math.PI ? 1 : 0;
        const d = `M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`;
        const mid = (a0 + a1) / 2; a0 = a1;
        return <g key={s.name}><path d={d} fill={S(i)} stroke="var(--surface)" strokeWidth={2}><title>{`${s.name}: ${s.value}%`}</title></path>
          {s.value >= 6 && <text x={cx + r * 0.66 * Math.cos(mid)} y={cy + r * 0.66 * Math.sin(mid) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff" style={{ paintOrder: "stroke" }} stroke="rgb(0 0 0 / .35)" strokeWidth={2}>{s.value}%</text>}</g>;
      })}
      <g fontSize="12">
        {f.slices.map((s, i) => <g key={s.name} transform={`translate(285 ${40 + i * 24})`}><rect width="12" height="12" rx="2" fill={S(i)} /><text x="18" y="10.5" fill="var(--text)">{s.name} <tspan fill="var(--muted)">{s.value}%</tspan></text></g>)}
      </g>
    </svg>
  );
}

function DataTable({ f }: { f: Extract<Figure, { kind: "table" }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[15px]">
        <thead className="bg-surface-2 text-sm"><tr><th scope="col" className="px-3 py-2">{f.rowHeader}</th>{f.columns.map((c) => <th key={c} scope="col" className="px-3 py-2 text-right">{c}</th>)}</tr></thead>
        <tbody>{f.rows.map((r) => <tr key={r.name} className="border-t border-line"><th scope="row" className="px-3 py-2 font-medium">{r.name}</th>{r.values.map((v, i) => <td key={i} className="px-3 py-2 text-right tabular-nums">{fmt(v)}</td>)}</tr>)}</tbody>
      </table>
      {f.unit && f.unit !== "%" && <p className="mt-1 text-xs text-muted">Units: {f.unit}</p>}
    </div>
  );
}

function DataView({ figure }: { figure: Figure }) {
  const [open, setOpen] = useState(false);
  if (figure.kind !== "line" && figure.kind !== "bar" && figure.kind !== "pie") return null;
  return (
    <div className="mt-2 text-sm">
      <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"} the data as a table</button>
      {open && (figure.kind === "pie"
        ? <DataTable f={{ kind: "table", title: figure.title, unit: "%", rowHeader: "Category", columns: ["%"], rows: figure.slices.map((s) => ({ name: s.name, values: [s.value] })) }} />
        : <DataTable f={{ kind: "table", title: figure.title, unit: figure.unit, rowHeader: figure.xLabel, columns: figure.series.map((s) => s.name), rows: figure.x.map((x, i) => ({ name: x, values: figure.series.map((s) => s.values[i]) })) }} />)}
    </div>
  );
}

// ---------- diagrams ----------
function Arrowhead({ id }: { id: string }) {
  return <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" /></marker></defs>;
}
function wrap(text: string, max: number) {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const w of words) { if ((cur + " " + w).trim().length > max) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
function NodeBox({ n, x, y, w, h, i }: { n: FlowNode; x: number; y: number; w: number; h: number; i?: number }) {
  const title = wrap(`${i !== undefined ? `${i + 1}. ` : ""}${n.label}`, Math.floor(w / 7.6));
  const lines = n.note ? wrap(n.note, Math.floor(w / 6.4)) : [];
  const hh = Math.max(h, 12 + title.length * 15 + lines.length * 13 + 6);
  return (
    <g>
      <rect x={x} y={y} width={w} height={hh} rx={n.shape === "round" ? Math.min(hh / 2, 22) : 10} fill={n.shape === "store" ? "var(--primary-soft)" : "var(--surface)"} stroke="var(--primary)" strokeWidth={1.5} />
      {title.map((t, k) => <text key={k} x={x + w / 2} y={y + 18 + k * 15} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)">{t}</text>)}
      {lines.slice(0, 3).map((l, k) => <text key={k} x={x + w / 2} y={y + 18 + title.length * 15 + 2 + k * 13} textAnchor="middle" fontSize="11" fill="var(--muted)">{l}</text>)}
    </g>
  );
}
function LinearFlow({ f }: { f: Extract<Figure, { kind: "flow" }> }) {
  const mid = useId().replace(/:/g, "");
  const cols = f.nodes.length > 8 ? 4 : 3, w = 180, h = 74, gx = 36, gy = 40;
  const pos = new Map(f.nodes.map((n, i) => { const row = Math.floor(i / cols); const c = i % cols; const col = row % 2 === 0 ? c : cols - 1 - c; return [n.id, { x: 10 + col * (w + gx), y: 10 + row * (h + gy) }]; }));
  const rows = Math.ceil(f.nodes.length / cols), W = 20 + cols * w + (cols - 1) * gx, H = 20 + rows * h + (rows - 1) * gy;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${f.title}. ${f.nodes.map((n, i) => `${i + 1}: ${n.label}`).join("; ")}`}>
      <Arrowhead id={mid} />
      {f.edges.map((e, k) => { const a = pos.get(e.from)!, b = pos.get(e.to)!; const sameRow = a.y === b.y;
        const [x1, y1, x2, y2] = sameRow ? (b.x > a.x ? [a.x + w, a.y + h / 2, b.x - 4, b.y + h / 2] : [a.x, a.y + h / 2, b.x + w + 4, b.y + h / 2]) : [a.x + w / 2, a.y + h, b.x + w / 2, b.y - 4];
        return <g key={k}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--primary)" strokeWidth={1.8} strokeDasharray={e.dashed ? "4 4" : undefined} markerEnd={`url(#${mid})`} />{e.label && <text x={(x1 + x2) / 2 + 4} y={(y1 + y2) / 2 - 4} fontSize="10.5" fill="var(--muted)">{e.label}</text>}</g>; })}
      {f.nodes.map((n, i) => { const p = pos.get(n.id)!; return <NodeBox key={n.id} n={n} x={p.x} y={p.y} w={w} h={h} i={i} />; })}
    </svg>
  );
}
function CycleFlow({ f }: { f: Extract<Figure, { kind: "flow" }> }) {
  const mid = useId().replace(/:/g, "");
  const W = 700, H = 540, cx = W / 2, cy = H / 2, R = 195, w = 184, h = 70, n = f.nodes.length;
  const pos = f.nodes.map((_, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / n; return { x: cx + R * 1.18 * Math.cos(a) - w / 2, y: cy + R * Math.sin(a) - h / 2, a }; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${f.title}, a cycle: ${f.nodes.map((x) => x.label).join(" → ")} → back to ${f.nodes[0].label}`}>
      <Arrowhead id={mid} />
      <circle cx={cx} cy={cy} r={R * 0.55} fill="var(--primary-soft)" opacity={0.5} />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--primary)">{f.title}</text>
      {pos.map((p, i) => { const a1 = p.a + 0.32, a2 = p.a + (2 * Math.PI) / n - 0.32;
        return <path key={i} d={`M${cx + R * Math.cos(a1)},${cy + R * 0.86 * Math.sin(a1)} A${R},${R * 0.86} 0 0 1 ${cx + R * Math.cos(a2)},${cy + R * 0.86 * Math.sin(a2)}`} fill="none" stroke="var(--primary)" strokeWidth={1.8} markerEnd={`url(#${mid})`} />; })}
      {f.nodes.map((nd, i) => <NodeBox key={nd.id} n={nd} x={pos[i].x} y={pos[i].y} w={w} h={h} i={i} />)}
      {f.note && <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">{f.note}</text>}
    </svg>
  );
}
function Schematic({ f }: { f: Extract<Figure, { kind: "flow" }> }) {
  const mid = useId().replace(/:/g, "");
  const W = 660, H = 560, sx = W / 100, sy = (H - 20) / 100;
  const box = (n: FlowNode) => { const w = (n.w ?? 26) * sx * 0.8, h = Math.max(44, (n.h ?? 10) * sy) + (n.note ? 12 : 0); return { x: Math.max(4, Math.min(W - w - 4, (n.x ?? 50) * sx - w / 2)), y: (n.y ?? 50) * sy, w, h }; };
  const edgePoints = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) => {
    const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const clip = (c: { x: number; y: number }, o: { x: number; y: number }, r: ReturnType<typeof box>, pad: number) => {
      const dx = o.x - c.x, dy = o.y - c.y; const t = Math.min(Math.abs((r.w / 2 + pad) / (dx || 1e-9)), Math.abs((r.h / 2 + pad) / (dy || 1e-9)));
      return { x: c.x + dx * t, y: c.y + dy * t };
    };
    return [clip(ac, bc, a, 0), clip(bc, ac, b, 5)];
  };
  const byId = new Map(f.nodes.map((n) => [n.id, box(n)]));
  return (
    <svg viewBox={`0 0 ${W} ${H + (f.note ? 16 : 0)}`} className="w-full" role="img" aria-label={`${f.title}. Labelled parts: ${f.nodes.map((n) => n.label).join(", ")}.`}>
      <Arrowhead id={mid} />
      {f.nodes.map((n) => { const b = byId.get(n.id)!; return <NodeBox key={n.id} n={n} x={b.x} y={b.y} w={b.w} h={b.h} />; })}
      {f.edges.map((e, k) => { const [p, q] = edgePoints(byId.get(e.from)!, byId.get(e.to)!);
        return <g key={k}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--primary)" strokeWidth={1.8} strokeDasharray={e.dashed ? "4 4" : undefined} markerEnd={`url(#${mid})`} />{e.label && <text x={(p.x + q.x) / 2 + 5} y={(p.y + q.y) / 2 - 5} fontSize="10.5" fill="var(--muted)" style={{ paintOrder: "stroke" }} stroke="var(--surface)" strokeWidth={3}>{e.label}</text>}</g>; })}
      {f.note && <text x={W / 2} y={H + 10} textAnchor="middle" fontSize="11.5" fill="var(--muted)">{f.note}</text>}
    </svg>
  );
}

// ---------- maps and plans ----------
const MAP_STYLE: Record<MapFeature["type"], { fill: string; stroke?: string; text?: string }> = {
  water: { fill: "var(--map-water)", text: "var(--map-water-text)" }, road: { fill: "none", stroke: "var(--map-road)" }, rail: { fill: "none", stroke: "var(--map-rail)" },
  building: { fill: "var(--map-building)" }, housing: { fill: "var(--map-housing)" }, park: { fill: "var(--map-park)" }, trees: { fill: "var(--map-trees)" },
  field: { fill: "var(--map-field)" }, parking: { fill: "var(--map-parking)" }, beach: { fill: "var(--map-beach)" }, path: { fill: "none", stroke: "var(--map-path)" }, bridge: { fill: "none", stroke: "var(--map-road)" },
};
function MapPanel({ caption, features }: { caption: string; features: MapFeature[] }) {
  const s = 6.2;
  return (
    <div>
      <p className="mb-1 text-center text-sm font-bold">{caption}</p>
      <svg viewBox={`0 0 ${100 * s} ${70 * s}`} className="w-full rounded-lg border border-line" role="img" aria-label={`${caption}: ${features.filter((f) => f.label).map((f) => f.label).join(", ")}`}>
        <rect width={100 * s} height={70 * s} fill="var(--map-land)" />
        {features.map((f, i) => { const st = MAP_STYLE[f.type];
          if (f.rect) { const [x, y, w, h] = f.rect; return <g key={i}><rect x={x * s} y={y * s} width={w * s} height={h * s} rx={f.type === "water" ? 0 : 4} fill={st.fill} stroke="var(--surface)" strokeWidth={1.5} strokeDasharray={f.type === "trees" ? undefined : undefined} />
            {f.type === "trees" && Array.from({ length: Math.max(1, Math.floor((w * h) / 60)) }, (_, k) => <circle key={k} cx={(x + ((k * 7.3) % w)) * s + 6} cy={(y + ((k * 4.7) % h)) * s + 6} r={4} fill="var(--map-tree-dot)" />)}
            {f.label && <text x={(x + w / 2) * s} y={(y + h / 2) * s + 6} textAnchor="middle" fontSize="19" fontWeight="600" fill={st.text ?? "var(--text)"} style={{ paintOrder: "stroke" }} stroke="var(--map-label-halo)" strokeWidth={3}>{f.label}</text>}</g>; }
          if (f.line) { const pts = f.line.map(([x, y]) => `${x * s},${y * s}`).join(" "); const [lx, ly] = f.line.length === 2 ? [(f.line[0][0] + f.line[1][0]) / 2 - 12, (f.line[0][1] + f.line[1][1]) / 2] : f.line[Math.floor(f.line.length / 2)];
            return <g key={i}><polyline points={pts} fill="none" stroke={f.type === "water" ? "var(--map-water)" : st.stroke} strokeWidth={(f.width ?? 3) * s * 0.6} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={f.type === "rail" ? "10 6" : f.type === "path" ? "4 4" : undefined} />
              {f.label && <text x={lx * s + 8} y={ly * s - 10} fontSize="18" fontWeight="600" fill="var(--text)" style={{ paintOrder: "stroke" }} stroke="var(--map-label-halo)" strokeWidth={3}>{f.label}</text>}</g>; }
          return null; })}
        <g transform={`translate(${100 * s - 30} 34)`} aria-hidden="true"><path d="M0,-22 L8,6 L0,0 L-8,6 Z" fill="var(--text)" /><text y="26" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--text)">N</text></g>
      </svg>
    </div>
  );
}
function MapPanels({ f }: { f: Extract<Figure, { kind: "map" }> }) {
  return <div className="grid gap-4 md:grid-cols-2">{f.panels.map((p) => <MapPanel key={p.caption} caption={p.caption} features={p.features} />)}</div>;
}
function PlanPanels({ f }: { f: Extract<Figure, { kind: "plan" }> }) {
  const s = 6.2;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {f.panels.map((p) => (
        <div key={p.caption}>
          <p className="mb-1 text-center text-sm font-bold">{p.caption}</p>
          <svg viewBox={`0 0 ${100 * s} ${70 * s}`} className="w-full rounded-lg border border-line" role="img" aria-label={`${p.caption}: ${p.rooms.map((r) => r.label).join(", ")}`}>
            <rect width={100 * s} height={70 * s} fill="var(--surface)" />
            {p.rooms.map((r, i) => { const lines = wrap(r.label, Math.max(6, Math.floor((r.w * s) / 11))); return (
              <g key={i}><rect x={r.x * s} y={r.y * s} width={r.w * s} height={r.h * s} fill={`var(--plan-${r.tone ?? "a"})`} stroke="var(--text)" strokeWidth={2} />
                {lines.map((l, k) => <text key={k} x={(r.x + r.w / 2) * s} y={(r.y + r.h / 2) * s + 6 + (k - (lines.length - 1) / 2) * 21} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--text)">{l}</text>)}</g>); })}
            {(p.entrances ?? []).map(([x, y], i) => <g key={i}><rect x={x * s - 14} y={y * s - 3} width={28} height={6} fill="var(--accent)" /><text x={x * s} y={y * s + (y > 60 ? -10 : 22)} textAnchor="middle" fontSize="15" fill="var(--muted)">Entrance</text></g>)}
          </svg>
        </div>
      ))}
    </div>
  );
}
