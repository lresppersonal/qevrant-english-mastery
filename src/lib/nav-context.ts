import { getTheme, getLesson } from "@/lib/content";

/**
 * Where a learner entered a page from, carried in the URL as `?from=…` so it survives reloads,
 * new tabs and the browser's own Back/Forward, and is never shared between pages or learners.
 *
 *   topic:<theme>                    entered from a topic page (Topics → Education & Academia → …)
 *   grammar:<lesson>[:<stage>]       entered from a stage of a grammar lesson
 *
 * Contexts nest with ">": `grammar:passive-and-causative:produce>topic:science` means "back to the
 * Produce stage of that lesson, which itself was opened from the Science topic".
 * No `from` = direct access: each page falls back to its own section (Reading → Reading library).
 */
export const FROM = "from";
export const GRAMMAR_STAGES = ["understand", "recognise", "practise", "produce", "feedback", "review"] as const;
export type GrammarStage = (typeof GRAMMAR_STAGES)[number];

export type NavContext =
  | { kind: "topic"; slug: string; parent: NavContext | null }
  | { kind: "grammar"; slug: string; stage: GrammarStage | null; parent: NavContext | null };

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DEPTH = 3;

export function parseNavContext(raw: string | null | undefined, depth = 0): NavContext | null {
  if (!raw || depth >= MAX_DEPTH) return null;
  const cut = raw.indexOf(">");
  const head = cut < 0 ? raw : raw.slice(0, cut);
  const parent = cut < 0 ? null : parseNavContext(raw.slice(cut + 1), depth + 1);
  const [kind, slug, stage] = head.split(":");
  if (!slug || !SLUG.test(slug)) return null;
  if (kind === "topic" && getTheme(slug)) return { kind, slug, parent };
  if (kind === "grammar" && getLesson(slug)) {
    const st = (GRAMMAR_STAGES as readonly string[]).includes(stage ?? "") ? (stage as GrammarStage) : null;
    return { kind, slug, stage: st, parent };
  }
  return null;
}

export function encodeNavContext(ctx: NavContext | null): string {
  if (!ctx) return "";
  const head = ctx.kind === "topic" ? `topic:${ctx.slug}` : `grammar:${ctx.slug}${ctx.stage ? `:${ctx.stage}` : ""}`;
  return ctx.parent ? `${head}>${encodeNavContext(ctx.parent)}` : head;
}

export const topicContext = (slug: string, parent: NavContext | null = null): NavContext => ({ kind: "topic", slug, parent });
export const grammarContext = (slug: string, stage: GrammarStage | null, parent: NavContext | null = null): NavContext => ({ kind: "grammar", slug, stage, parent });

/** Add (or replace) the `from` parameter on an internal link, keeping its query and #hash. */
export function withNavContext(href: string, ctx: NavContext | null): string {
  if (!ctx || !href.startsWith("/")) return href;
  const [beforeHash, hash] = href.split("#");
  const [path, query = ""] = beforeHash.split("?");
  const q = new URLSearchParams(query);
  q.set(FROM, encodeNavContext(ctx));
  return `${path}?${q.toString()}${hash !== undefined ? `#${hash}` : ""}`;
}

/** Where "Back" goes for a context, and what it is called. */
export function contextTarget(ctx: NavContext): { href: string; label: string } {
  if (ctx.kind === "topic") {
    return { href: withNavContext(`/topics/${ctx.slug}`, ctx.parent), label: getTheme(ctx.slug)?.title ?? "Topic" };
  }
  const lesson = getLesson(ctx.slug);
  const base = ctx.stage && ctx.stage !== "understand" ? `/grammar/${ctx.slug}?stage=${ctx.stage}` : `/grammar/${ctx.slug}`;
  return { href: withNavContext(base, ctx.parent), label: lesson?.title ?? "Grammar lesson" };
}

/** Path + query without the hash, for comparing locations. */
export function locationKey(href: string): string {
  const [beforeHash] = href.split("#");
  const [path, query = ""] = beforeHash.split("?");
  const q = new URLSearchParams(query);
  q.sort();
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
