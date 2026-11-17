/**
 * Writing portfolio and speaking development: pure helpers over the learner's own saved submissions.
 * Nothing here calls the AI — it only analyses feedback that was already produced and stored.
 */
type Issue = { quote?: string; problem?: string; suggestion?: string; category?: string; severity?: string; grammarRef?: string | null };
type Criterion = { criterion?: string; band?: number };
type Fb = { estimate?: { mean?: number } | null; issues?: Issue[]; criteria?: Criterion[]; indicativeLevel?: string } | null | undefined;
export interface Submission { id: string; promptSlug: string; createdAt: string; feedback: unknown; status?: string; wordCount?: number; body?: string; transcript?: string }

export const fb = (s: Submission) => (s.feedback ?? null) as Fb;
export const bandOf = (s: Submission) => fb(s)?.estimate?.mean ?? null;
export const isAssessed = (s: Submission) => !!fb(s) && (s.status === undefined || s.status === "assessed");

/** Assessed submissions in time order with their overall band and per-criterion bands. */
export function bandSeries(subs: Submission[]) {
  return subs.filter(isAssessed).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((s) => ({
    id: s.id, promptSlug: s.promptSlug, date: s.createdAt, band: bandOf(s),
    criteria: Object.fromEntries((fb(s)?.criteria ?? []).filter((c) => c.criterion && typeof c.band === "number").map((c) => [c.criterion!, c.band!])),
    issues: (fb(s)?.issues ?? []).length,
  }));
}

export const CATEGORY_LABEL: Record<string, string> = {
  grammar: "Grammar", vocabulary: "Vocabulary", collocation: "Collocation", cohesion: "Cohesion and linking",
  register: "Academic register", task: "Task response", spelling_punctuation: "Spelling and punctuation",
};

export interface Recurring { key: string; category: string; grammarRef: string | null; count: number; pieces: number; lastSeen: string; examples: { quote: string; suggestion: string }[]; trend: "improving" | "persisting" | "new" }

/**
 * Mistakes that keep coming back: grouped by grammar reference when the AI linked one, otherwise by category.
 * "Recurring" means it appears in at least two different pieces of work. Trend compares the latest piece with earlier ones.
 */
export function recurringIssues(subs: Submission[]): Recurring[] {
  const done = subs.filter(isAssessed).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!done.length) return [];
  const latest = done[done.length - 1].id;
  const groups = new Map<string, Recurring & { ids: Set<string>; inLatest: boolean; before: boolean }>();
  for (const s of done) {
    for (const i of fb(s)?.issues ?? []) {
      if (i.severity === "style") continue;
      const key = i.grammarRef || `category:${i.category ?? "other"}`;
      const g = groups.get(key) ?? { key, category: i.category ?? "other", grammarRef: i.grammarRef ?? null, count: 0, pieces: 0, lastSeen: s.createdAt, examples: [], trend: "new" as const, ids: new Set<string>(), inLatest: false, before: false };
      g.count++; g.ids.add(s.id); g.lastSeen = s.createdAt;
      if (s.id === latest) g.inLatest = true; else g.before = true;
      if (i.quote && i.suggestion && g.examples.length < 3) g.examples.push({ quote: i.quote, suggestion: i.suggestion });
      groups.set(key, g);
    }
  }
  return [...groups.values()].map(({ ids, inLatest, before, ...g }) => ({ ...g, pieces: ids.size, trend: (before && !inLatest ? "improving" : before && inLatest ? "persisting" : "new") as Recurring["trend"] }))
    .filter((g) => g.pieces >= 2 || done.length === 1)
    .sort((a, b) => b.pieces - a.pieces || b.count - a.count);
}

export type DiffPart = { type: "same" | "added" | "removed"; text: string };

/** Word-level diff (LCS) between two versions of a text, for version comparison. */
export function wordDiff(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/).filter((t) => t.length), B = b.split(/(\s+)/).filter((t) => t.length);
  if (A.length * B.length > 4_000_000) return [{ type: "removed", text: a }, { type: "added", text: b }];
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => { const last = out[out.length - 1]; if (last?.type === type) last.text += text; else out.push({ type, text }); };
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("same", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("removed", A[i]); i++; }
    else { push("added", B[j]); j++; }
  }
  while (i < n) push("removed", A[i++]);
  while (j < m) push("added", B[j++]);
  return out;
}

/** What changed between two assessed versions: band, criteria, number of issues and which issue types disappeared. */
export function compareVersions(older: Submission, newer: Submission) {
  const cat = (s: Submission) => { const m = new Map<string, number>(); for (const i of fb(s)?.issues ?? []) if (i.severity !== "style") m.set(i.category ?? "other", (m.get(i.category ?? "other") ?? 0) + 1); return m; };
  const before = cat(older), after = cat(newer);
  const categories = [...new Set([...before.keys(), ...after.keys()])].map((c) => ({ category: c, before: before.get(c) ?? 0, after: after.get(c) ?? 0 }))
    .sort((x, y) => (y.before - y.after) - (x.before - x.after));
  const crit = (s: Submission) => Object.fromEntries((fb(s)?.criteria ?? []).filter((c) => c.criterion && typeof c.band === "number").map((c) => [c.criterion!, c.band!]));
  const cb = crit(older), ca = crit(newer);
  return {
    band: { before: bandOf(older), after: bandOf(newer) },
    criteria: [...new Set([...Object.keys(cb), ...Object.keys(ca)])].map((k) => ({ criterion: k, before: cb[k] ?? null, after: ca[k] ?? null })),
    categories,
    words: { before: older.wordCount ?? null, after: newer.wordCount ?? null },
  };
}

/** Plain-language summary of development over time (needs at least two assessed pieces). */
export function developmentSummary(subs: Submission[]): string | null {
  const s = bandSeries(subs).filter((x) => x.band !== null);
  if (s.length < 2) return null;
  const half = Math.max(1, Math.floor(s.length / 2));
  const avg = (xs: typeof s) => xs.reduce((n, x) => n + x.band!, 0) / xs.length;
  const early = avg(s.slice(0, half)), late = avg(s.slice(-half));
  const d = Math.round((late - early) * 2) / 2;
  const issuesEarly = s.slice(0, half).reduce((n, x) => n + x.issues, 0) / half, issuesLate = s.slice(-half).reduce((n, x) => n + x.issues, 0) / half;
  const bandPart = d > 0 ? `Your estimated band has risen by about ${d} from your earlier work` : d < 0 ? `Your estimated band is about ${-d} lower than in your earlier work — often a sign of harder tasks or more ambitious language` : "Your estimated band is stable";
  const issuePart = issuesLate < issuesEarly - 0.5 ? `, and recent pieces have fewer flagged problems (${issuesLate.toFixed(1)} vs ${issuesEarly.toFixed(1)} on average).` : issuesLate > issuesEarly + 0.5 ? `; recent pieces have more flagged problems (${issuesLate.toFixed(1)} vs ${issuesEarly.toFixed(1)}).` : ".";
  return bandPart + issuePart;
}
