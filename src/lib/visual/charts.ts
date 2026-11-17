import type { Figure, Series, VisualTask, VisualType } from "./types";
import { keyFeaturesFor, factsFor } from "./analysis";
import { VOCAB, EXPRESSIONS } from "./language";

/**
 * Seeded generator for charts, tables and combined visuals. A task id such as "line-2-48213"
 * (type, template, seed) always regenerates exactly the same data, in the browser and on the
 * server, so the figure, the instructions, the key features and the AI's fact-check agree.
 * All numbers are invented for practice and labelled as such.
 */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
type R = ReturnType<typeof rng>;
const pick = <T,>(r: R, xs: T[]) => xs[Math.floor(r() * xs.length)];
const between = (r: R, lo: number, hi: number) => lo + r() * (hi - lo);
const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp;
const COUNTRIES = ["Norway", "Portugal", "Japan", "Canada", "Poland", "Chile", "Kenya", "Austria", "Vietnam", "Mexico", "Ireland", "Morocco"];
const CITIES = ["Lisbon", "Vienna", "Seoul", "Toronto", "Kraków", "Lyon", "Melbourne", "Valencia", "Osaka", "Nairobi"];

/** A series that moves from start to end with a chosen shape and mild noise. */
function trend(r: R, n: number, start: number, end: number, shape: "linear" | "late" | "early" | "peak" | "dip", noise: number, dp: number, lo = 0, hi = Infinity) {
  const out: number[] = [];
  const peakAt = 0.35 + r() * 0.3, bump = (end - start || start * 0.3) * (0.5 + r() * 0.5);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);
    let f = t;
    if (shape === "late") f = t * t;
    if (shape === "early") f = Math.sqrt(t);
    let v = start + (end - start) * f;
    if (shape === "peak") v += Math.abs(bump) * Math.max(0, 1 - Math.abs(t - peakAt) / 0.35);
    if (shape === "dip") v -= Math.abs(bump) * Math.max(0, 1 - Math.abs(t - peakAt) / 0.35);
    if (i > 0 && i < n - 1) v += (r() - 0.5) * 2 * noise;
    out.push(round(Math.min(hi, Math.max(lo, v)), dp));
  }
  return out;
}
/** Integer percentages that add up to exactly 100. */
function shares(r: R, weights: number[]) {
  const raw = weights.map((w) => w * (0.7 + r() * 0.6));
  const sum = raw.reduce((a, b) => a + b, 0);
  const pct = raw.map((v) => Math.floor((v / sum) * 100));
  let rest = 100 - pct.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [(v / sum) * 100 - pct[i], i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) pct[order[k][1]]++;
  return pct;
}
const years = (from: number, step: number, n: number) => Array.from({ length: n }, (_, i) => String(from + i * step));

// ---------------- line graphs ----------------
type LineT = (r: R) => Extract<Figure, { kind: "line" }> & { subject: string };
const LINE: LineT[] = [
  (r) => { const cs = [...COUNTRIES].sort(() => r() - 0.5).slice(0, 4); const x = years(2000, 4, 6);
    return { kind: "line", subject: `the percentage of households with a broadband internet connection in ${cs.slice(0, 3).join(", ")} and ${cs[3]} between 2000 and 2020`, title: "Households with broadband access", xLabel: "Year", yLabel: "% of households", unit: "%", x,
      series: cs.map((c, i) => ({ name: c, values: trend(r, 6, between(r, 3, 25), between(r, 62, 96), pick(r, ["early", "linear", "late"]), 4, 0, 0, 100) })).map((s, i) => (i === 3 ? { ...s, values: trend(r, 6, between(r, 1, 6), between(r, 35, 60), "late", 3, 0, 0, 100) } : s)) }; },
  (r) => { const city = pick(r, CITIES); const x = years(1990, 5, 7);
    return { kind: "line", subject: `the average number of daily journeys made by car, bus, bicycle and on foot per resident of ${city} from 1990 to 2020`, title: `Daily journeys per resident, ${city}`, xLabel: "Year", yLabel: "Journeys per day", unit: "journeys", x,
      series: [
        { name: "Car", values: trend(r, 7, between(r, 1.4, 1.8), between(r, 0.8, 1.1), pick(r, ["peak", "linear"]), 0.08, 2, 0) },
        { name: "Bus", values: trend(r, 7, between(r, 0.5, 0.7), between(r, 0.55, 0.8), "dip", 0.05, 2, 0) },
        { name: "Bicycle", values: trend(r, 7, between(r, 0.05, 0.15), between(r, 0.5, 0.8), "late", 0.04, 2, 0) },
        { name: "Walking", values: trend(r, 7, between(r, 0.6, 0.8), between(r, 0.6, 0.9), "linear", 0.06, 2, 0) },
      ] }; },
  (r) => { const x = years(1970, 10, 6);
    return { kind: "line", subject: "the amount of electricity generated from coal, natural gas, nuclear power and renewable sources in one country between 1970 and 2020", title: "Electricity generation by source", xLabel: "Year", yLabel: "Terawatt hours (TWh)", unit: "TWh", x,
      series: [
        { name: "Coal", values: trend(r, 6, between(r, 160, 210), between(r, 5, 25), pick(r, ["peak", "late"]), 12, 0, 0) },
        { name: "Natural gas", values: trend(r, 6, between(r, 2, 10), between(r, 90, 130), "peak", 12, 0, 0) },
        { name: "Nuclear", values: trend(r, 6, between(r, 20, 35), between(r, 45, 60), "peak", 6, 0, 0) },
        { name: "Renewables", values: trend(r, 6, between(r, 3, 8), between(r, 100, 140), "late", 4, 0, 0) },
      ] }; },
  (r) => { const x = years(2015, 1, 9);
    return { kind: "line", subject: "the number of visitors to three museums in one city between 2015 and 2023", title: "Annual museum visitors", xLabel: "Year", yLabel: "Visitors (thousands)", unit: "thousand visitors", x,
      series: ["Science Museum", "Art Gallery", "History Museum"].map((m) => { const v = trend(r, 9, between(r, 200, 600), between(r, 250, 750), pick(r, ["linear", "early"]), 25, 0, 0); v[5] = round(v[5] * between(r, 0.15, 0.3), 0); v[6] = round(v[6] * between(r, 0.45, 0.7), 0); return { name: m, values: v }; }) }; },
  (r) => { const x = years(1960, 10, 7);
    return { kind: "line", subject: "the proportion of the population aged 65 and over in Japan, Italy, the United States and Nigeria from 1960 to 2020", title: "Population aged 65 and over", xLabel: "Year", yLabel: "% of population", unit: "%", x,
      series: [
        { name: "Japan", values: trend(r, 7, between(r, 5, 7), between(r, 27, 30), "late", 0.6, 1, 0) },
        { name: "Italy", values: trend(r, 7, between(r, 8, 10), between(r, 22, 24), "linear", 0.6, 1, 0) },
        { name: "United States", values: trend(r, 7, between(r, 8.5, 9.5), between(r, 15, 17.5), "late", 0.5, 1, 0) },
        { name: "Nigeria", values: trend(r, 7, between(r, 2.5, 3.2), between(r, 2.6, 3.4), "linear", 0.15, 1, 0) },
      ] }; },
  (r) => { const x = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; const c1 = pick(r, CITIES); const c2 = pick(r, CITIES.filter((c) => c !== c1));
    const temp = (base: number, amp: number) => x.map((_, i) => round(base + amp * -Math.cos(((i + 0.5) / 12) * 2 * Math.PI) + (r() - 0.5) * 1.2, 1));
    return { kind: "line", subject: `the average monthly temperature in two cities, ${c1} and ${c2}, over one year`, title: "Average monthly temperature", xLabel: "Month", yLabel: "Temperature (°C)", unit: "°C", x,
      series: [{ name: c1, values: temp(between(r, 12, 17), between(r, 7, 10)) }, { name: c2, values: temp(between(r, 4, 10), between(r, 10, 14)) }] }; },
];

// ---------------- bar charts ----------------
type BarT = (r: R) => Extract<Figure, { kind: "bar" }> & { subject: string };
const BAR: BarT[] = [
  (r) => { const x = ["16–24", "25–34", "35–49", "50–64", "65+"];
    return { kind: "bar", subject: "the percentage of people in different age groups who did voluntary work at least once a month in 2005 and 2025", title: "Regular volunteering by age group", xLabel: "Age group", yLabel: "% of age group", unit: "%", x,
      series: [{ name: "2005", values: x.map((_, i) => round(between(r, 14, 22) + i * between(r, 0, 3), 0)) }, { name: "2025", values: x.map((_, i) => round(between(r, 10, 30) + (i === 4 ? between(r, 5, 10) : 0), 0)) }] }; },
  (r) => { const cs = [...COUNTRIES].sort(() => r() - 0.5).slice(0, 5);
    return { kind: "bar", subject: `the average number of hours per week that men and women spent on unpaid domestic work in ${cs.slice(0, 4).join(", ")} and ${cs[4]}`, title: "Weekly hours of unpaid domestic work", xLabel: "Country", yLabel: "Hours per week", unit: "hours", x: cs,
      series: [{ name: "Men", values: cs.map(() => round(between(r, 6, 17), 1)) }, { name: "Women", values: cs.map(() => round(between(r, 17, 32), 1)) }] }; },
  (r) => { const x = ["Fiction", "Non-fiction", "Children's", "Academic", "Comics"];
    return { kind: "bar", subject: "the sales of printed books and e-books in five categories in one country in a single year", title: "Book sales by category", xLabel: "Category", yLabel: "Copies sold (millions)", unit: "million copies", x,
      series: [{ name: "Printed", values: x.map(() => round(between(r, 3, 28), 1)) }, { name: "E-book", values: x.map((_, i) => round(between(r, 0.5, i === 0 ? 14 : 7), 1)) }] }; },
  (r) => { const x = ["Food", "Housing", "Transport", "Leisure", "Health"];
    return { kind: "bar", subject: "the proportion of household spending on five categories in one country in 1990, 2005 and 2020", title: "Share of household spending", xLabel: "Category", yLabel: "% of total spending", unit: "%", x,
      series: [
        { name: "1990", values: [round(between(r, 24, 30), 0), round(between(r, 18, 23), 0), round(between(r, 11, 15), 0), round(between(r, 8, 11), 0), round(between(r, 3, 5), 0)] },
        { name: "2005", values: [round(between(r, 17, 22), 0), round(between(r, 22, 27), 0), round(between(r, 13, 16), 0), round(between(r, 10, 13), 0), round(between(r, 4, 6), 0)] },
        { name: "2020", values: [round(between(r, 12, 16), 0), round(between(r, 28, 34), 0), round(between(r, 12, 15), 0), round(between(r, 9, 14), 0), round(between(r, 5, 8), 0)] },
      ] }; },
  (r) => { const x = ["Engineering", "Medicine", "Law", "Education", "Computing", "Arts"];
    return { kind: "bar", subject: "the number of male and female graduates in six subjects from a university in 2024", title: "Graduates by subject and gender", xLabel: "Subject", yLabel: "Graduates", unit: "graduates", x,
      series: [{ name: "Male", values: x.map((_, i) => round(between(r, [380, 220, 180, 90, 420, 140][i] * 0.8, [380, 220, 180, 90, 420, 140][i] * 1.2), 0)) }, { name: "Female", values: x.map((_, i) => round(between(r, [110, 290, 230, 310, 120, 260][i] * 0.8, [110, 290, 230, 310, 120, 260][i] * 1.2), 0)) }] }; },
  (r) => { const cs = [...COUNTRIES].sort(() => r() - 0.5).slice(0, 6);
    return { kind: "bar", subject: `the amount of plastic packaging waste per person and the proportion recycled in ${cs.length} countries`, title: "Plastic packaging waste per person", xLabel: "Country", yLabel: "Kilograms per person", unit: "kg", x: cs,
      series: [{ name: "Waste produced", values: cs.map(() => round(between(r, 18, 55), 0)) }, { name: "Recycled", values: [] }] }; },
];
// The last template derives "recycled" from "produced" so the bars are always consistent.
const fixBar = (f: ReturnType<BarT>, r: R) => {
  if (f.series[1]?.values.length === 0) f.series[1] = { name: "Recycled", values: f.series[0].values.map((v) => round(v * between(r, 0.15, 0.6), 0)) };
  return f;
};

// ---------------- pie charts (two years) ----------------
type PieT = (r: R) => { subject: string; years: [string, string]; title: string; names: string[]; weights: [number[], number[]] };
const PIE: PieT[] = [
  () => ({ subject: "the sources of energy used to heat homes in one country", years: ["1995", "2025"], title: "Home heating by energy source", names: ["Gas", "Oil", "Electricity", "Heat pumps", "Wood and biomass", "Other"], weights: [[45, 25, 15, 1, 9, 5], [38, 6, 22, 18, 11, 5]] }),
  () => ({ subject: "how a university spent its annual budget", years: ["2010", "2025"], title: "University spending", names: ["Teaching staff", "Research", "Buildings", "Student services", "Administration", "Digital"], weights: [[40, 18, 17, 8, 12, 5], [34, 22, 12, 11, 9, 12]] }),
  () => ({ subject: "the main reasons international visitors gave for visiting one country", years: ["2000", "2024"], title: "Main reason for visit", names: ["Holiday", "Business", "Visiting family", "Study", "Other"], weights: [[55, 25, 12, 4, 4], [48, 14, 20, 12, 6]] }),
  () => ({ subject: "the ways in which commuters travelled to work in one city", years: ["2004", "2024"], title: "Commuting to work", names: ["Car", "Bus", "Train", "Cycling", "Walking", "Working from home"], weights: [[52, 18, 12, 4, 11, 3], [34, 14, 15, 11, 10, 16]] }),
];

// ---------------- tables ----------------
type TableT = (r: R) => Extract<Figure, { kind: "table" }> & { subject: string };
const TABLE: TableT[] = [
  (r) => { const cs = [...CITIES].sort(() => r() - 0.5).slice(0, 5); const cols = ["2000", "2010", "2020"];
    return { kind: "table", subject: `the population of five cities, ${cs.join(", ")}, in 2000, 2010 and 2020`, title: "City population (millions)", unit: "million", rowHeader: "City", columns: cols,
      rows: cs.map((c) => { const s = between(r, 0.8, 6); return { name: c, values: trend(r, 3, s, s * between(r, 0.92, 1.6), "linear", 0.05, 2, 0) }; }) }; },
  (r) => { const cols = ["Under 30", "30–49", "50 and over"];
    return { kind: "table", subject: "the percentage of people in three age groups who used five types of media every day", title: "Daily media use by age group (%)", unit: "%", rowHeader: "Media", columns: cols,
      rows: [["Social media", 90, 70, 40], ["Television", 35, 60, 85], ["Podcasts", 45, 30, 15], ["Printed newspapers", 5, 12, 35], ["Radio", 20, 40, 60]].map(([n, a, b, c]) => ({ name: n as string, values: [a, b, c].map((v) => round(Math.min(99, Math.max(1, (v as number) + (r() - 0.5) * 16)), 0)) })) }; },
  (r) => { const cs = [...COUNTRIES].sort(() => r() - 0.5).slice(0, 5); const cols = ["Life expectancy (years)", "Health spending per person ($)", "Doctors per 1,000 people"];
    return { kind: "table", subject: `life expectancy, health spending and the number of doctors in five countries in 2023`, title: "Health indicators, 2023", unit: "", rowHeader: "Country", columns: cols,
      rows: cs.map((c) => { const le = round(between(r, 63, 84), 1); return { name: c, values: [le, round(between(r, 150, 7000) * ((le - 60) / 24), -1), round(between(r, 0.3, 5.2), 1)] }; }) }; },
  (r) => { const cols = ["Q1", "Q2", "Q3", "Q4"];
    return { kind: "table", subject: "the sales of four products by a technology company in each quarter of one year", title: "Units sold by quarter (thousands)", unit: "thousand units", rowHeader: "Product", columns: cols,
      rows: ["Smartwatches", "Tablets", "Headphones", "E-readers"].map((p, i) => ({ name: p, values: trend(r, 4, between(r, 20, 120), between(r, 20, 160), pick(r, ["linear", "peak", "dip"]), 10, 0, 1).map((v, q) => (i === 2 && q === 3 ? round(v * 1.5, 0) : v)) })) }; },
];

const INSTR = (what: string, subject: string) =>
  `The ${what} below ${what.endsWith("s") || what.includes(" and ") ? "show" : "shows"} ${subject}. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.`;
const NOTE = "The data are invented for practice and do not describe real statistics.";

function build(id: string, type: VisualType, title: string, level: VisualTask["level"], what: string, subject: string, figures: Figure[]): VisualTask {
  const group = type.includes("-") ? "combined" : "charts";
  return {
    id, group, type, title, level, figures, minWords: 150, minutes: 20,
    instruction: INSTR(what, subject),
    vocabulary: VOCAB[type] ?? VOCAB.line ?? [], expressions: EXPRESSIONS[type] ?? EXPRESSIONS.line ?? [],
    keyFeatures: figures.flatMap((f) => keyFeaturesFor(f)), facts: figures.map(factsFor).join("\n\n"), sourceNote: NOTE,
  };
}
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

export const CHART_TEMPLATES: Record<string, number> = { line: LINE.length, bar: BAR.length, pie: PIE.length, table: TABLE.length, "line-bar": 3, "pie-table": 2, "bar-table": 2, "line-pie": 2 };

export function generateChartTask(type: VisualType, template: number, seed: number): VisualTask | null {
  const r = rng(seed * 7919 + template * 104729 + type.length);
  const id = `${type}-${template}-${seed}`;
  if (type === "line") { const t = LINE[template]; if (!t) return null; const { subject, ...f } = t(r); return build(id, type, f.title, "B2+", "line graph", subject, [f]); }
  if (type === "bar") { const t = BAR[template]; if (!t) return null; const { subject, ...f } = fixBar(t(r), r); return build(id, type, f.title, "B2+", "bar chart", subject, [f]); }
  if (type === "pie") {
    const t = PIE[template]; if (!t) return null; const p = t(r);
    const figs: Figure[] = p.years.map((y, k) => { const v = shares(rng(seed + k * 31 + template), p.weights[k]); return { kind: "pie", title: `${p.title}, ${y}`, slices: p.names.map((n, i) => ({ name: n, value: v[i] })) }; });
    return build(id, type, p.title, "B2+", "pie charts", `${p.subject} in ${p.years[0]} and ${p.years[1]}`, figs);
  }
  if (type === "table") { const t = TABLE[template]; if (!t) return null; const { subject, ...f } = t(r); return build(id, type, f.title, "C1", "table", subject, [f]); }
  if (type === "line-bar") {
    if (template === 0) { // internet use
      const { subject, ...l } = LINE[0](r); const ages = ["16–24", "25–34", "35–54", "55–74", "75+"];
      const b: Figure = { kind: "bar", title: "Hours spent online per day, by age group", xLabel: "Age group", yLabel: "Hours per day", unit: "hours", x: ages,
        series: [{ name: "2010", values: ages.map((_, i) => round(between(r, 3.2, 4.2) - i * between(r, 0.5, 0.7), 1)) }, { name: "2024", values: ages.map((_, i) => round(between(r, 5.8, 7) - i * between(r, 0.7, 0.95), 1)) }] };
      b.series.forEach((s2) => (s2.values = s2.values.map((v) => Math.max(0.3, v))));
      return build(id, type, "Broadband access and time spent online", "C1", "line graph and bar chart", `${subject}, and the average number of hours per day that people in different age groups in one of these countries spent online in 2010 and 2024`, [l, b]);
    }
    if (template === 1) { // city transport
      const { subject, ...l } = LINE[1](r); const modes = ["Car", "Bus", "Bicycle", "Walking"];
      const b: Figure = { kind: "bar", title: "Residents satisfied with each mode of transport", xLabel: "Mode", yLabel: "% satisfied", unit: "%", x: modes,
        series: [{ name: "2000", values: [round(between(r, 62, 75), 0), round(between(r, 40, 55), 0), round(between(r, 25, 38), 0), round(between(r, 55, 68), 0)] }, { name: "2020", values: [round(between(r, 45, 58), 0), round(between(r, 48, 62), 0), round(between(r, 60, 78), 0), round(between(r, 66, 80), 0)] }] };
      return build(id, type, "Travel habits and satisfaction", "C1", "line graph and bar chart", `${subject}, and the percentage of residents who were satisfied with each mode of transport in 2000 and 2020`, [l, b]);
    }
    if (template === 2) { // museums
      const { subject, ...l } = LINE[3](r); const ages = ["Under 18", "18–34", "35–59", "60+"];
      const b: Figure = { kind: "bar", title: "Visitors by age group, 2023 (%)", xLabel: "Age group", yLabel: "% of visitors", unit: "%", x: ages,
        series: l.series.map((m, k) => { const v = shares(rng(seed + 97 + k), [[40, 25, 22, 13], [8, 30, 34, 28], [22, 18, 30, 30]][k]); return { name: m.name, values: v }; }) };
      return build(id, type, "Museum visitors", "C1", "line graph and bar chart", `${subject}, and the age profile of their visitors in 2023`, [l, b]);
    }
    return null;
  }
  if (type === "pie-table") {
    if (template === 0) { // home heating
      const p = PIE[0](r); const v = shares(rng(seed + 7), p.weights[1]);
      const pie: Figure = { kind: "pie", title: `${p.title}, ${p.years[1]}`, slices: p.names.map((n, i) => ({ name: n, value: v[i] })) };
      const base: Record<string, number> = { Gas: 1100, Oil: 1500, Electricity: 1700, "Heat pumps": 750, "Wood and biomass": 900, Other: 1000 };
      const t: Figure = { kind: "table", title: "Average annual heating cost per home (€)", unit: "€", rowHeader: "Energy source", columns: ["2015", "2020", "2025"],
        rows: p.names.map((n) => { const b0 = base[n] * between(r, 0.85, 1.1); return { name: n, values: [round(b0, -1), round(b0 * between(r, 0.95, 1.15), -1), round(b0 * between(r, n === "Heat pumps" ? 0.9 : 1.15, n === "Heat pumps" ? 1.1 : 1.6), -1)] }; }) };
      return build(id, type, "Home heating: sources and costs", "C1", "pie chart and table", `the sources of energy used to heat homes in one country in ${p.years[1]}, and the average annual cost of heating a home with each source in 2015, 2020 and 2025`, [pie, t]);
    }
    if (template === 1) { // commuting
      const p = PIE[3](r); const v = shares(rng(seed + 9), p.weights[1]);
      const pie: Figure = { kind: "pie", title: `${p.title}, ${p.years[1]}`, slices: p.names.map((n, i) => ({ name: n, value: v[i] })) };
      const modes = p.names.filter((n) => n !== "Working from home");
      const time: Record<string, [number, number]> = { Car: [28, 40], Bus: [38, 52], Train: [40, 60], Cycling: [18, 28], Walking: [14, 22] };
      const cost: Record<string, [number, number]> = { Car: [180, 320], Bus: [45, 75], Train: [90, 160], Cycling: [5, 15], Walking: [0, 0] };
      const t: Figure = { kind: "table", title: "Average one-way commute and monthly cost by mode", unit: "", rowHeader: "Mode", columns: ["Minutes (one way)", "Monthly cost (€)"],
        rows: modes.map((m) => ({ name: m, values: [round(between(r, ...time[m]), 0), round(between(r, ...cost[m]), 0)] })) };
      return build(id, type, "Commuting: modes, time and cost", "C1", "pie chart and table", `how commuters in one city travelled to work in ${p.years[1]}, and the average journey time and monthly cost of each mode of transport`, [pie, t]);
    }
    return null;
  }
  if (type === "bar-table") {
    if (template === 0) { // graduates
      const { subject, ...b } = BAR[4](r);
      const sal: Record<string, [number, number]> = { Engineering: [36, 44], Medicine: [40, 48], Law: [30, 42], Education: [27, 32], Computing: [35, 46], Arts: [22, 28] };
      const t: Figure = { kind: "table", title: "Graduate outcomes six months after graduation", unit: "", rowHeader: "Subject", columns: ["In work or further study (%)", "Average starting salary (€000)"],
        rows: b.x.map((sub) => ({ name: sub, values: [round(between(r, 78, 97), 0), round(between(r, ...sal[sub]), 1)] })) };
      return build(id, type, "Graduates: numbers and outcomes", "C1", "bar chart and table", `${subject}, and their employment rates and average starting salaries six months later`, [b, t]);
    }
    if (template === 1) { // domestic work
      const { subject, ...b } = BAR[1](r);
      const t: Figure = { kind: "table", title: "Adults in full-time paid employment (%)", unit: "%", rowHeader: "Country", columns: ["Men", "Women"],
        rows: b.x.map((c) => ({ name: c, values: [round(between(r, 58, 78), 0), round(between(r, 32, 62), 0)] })) };
      return build(id, type, "Unpaid and paid work", "C1", "bar chart and table", `${subject}, and the percentage of men and women in full-time paid employment in the same countries`, [b, t]);
    }
    return null;
  }
  if (type === "line-pie") {
    if (template === 0) { // electricity
      const { subject, ...l } = LINE[2](r); const v = shares(rng(seed + 11), [45, 22, 20, 9, 4]);
      const pie: Figure = { kind: "pie", title: `Renewable electricity by type, ${l.x[l.x.length - 1]}`, slices: ["Wind", "Solar", "Hydropower", "Biomass", "Other"].map((n, i) => ({ name: n, value: v[i] })) };
      return build(id, type, "Electricity generation and renewable sources", "C1", "line graph and pie chart", `${subject}, and the types of renewable source used in ${l.x[l.x.length - 1]}`, [l, pie]);
    }
    if (template === 1) { // journeys
      const { subject, ...l } = LINE[1](r); const v = shares(rng(seed + 13), [30, 12, 22, 26, 10]);
      const pie: Figure = { kind: "pie", title: `Purpose of journeys, ${l.x[l.x.length - 1]}`, slices: ["Work", "Education", "Shopping", "Leisure", "Other"].map((n, i) => ({ name: n, value: v[i] })) };
      return build(id, type, "Daily journeys and their purpose", "C1", "line graph and pie chart", `${subject}, and the purposes of these journeys in ${l.x[l.x.length - 1]}`, [l, pie]);
    }
    return null;
  }
  return null;
}

export { capital };
