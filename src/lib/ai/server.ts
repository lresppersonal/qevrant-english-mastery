import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { grammarCatalogue, vocabularyList } from "./prompts";

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;
export const transcriptionConfigured = () => !!process.env.OPENAI_API_KEY;

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * Who is calling, and may they use AI now?
 * - Supabase mode: must be signed in; daily limit counted from stored submissions.
 * - Demo mode: only when AI_DEMO_ALLOW=true (local development), never in production.
 */
export async function authorise() {
  if (!aiConfigured()) throw new HttpError(503, "AI feedback isn't configured on this server yet.");
  if (isDemoMode) {
    if (process.env.AI_DEMO_ALLOW !== "true") throw new HttpError(403, "AI feedback needs an account. It is switched off in Demo mode.");
    return { sb: null, userId: null };
  }
  const sb = await supabaseServer();
  const { data } = await sb!.auth.getUser();
  if (!data.user) throw new HttpError(401, "Please sign in to get AI feedback.");
  const limit = Number(process.env.AI_DAILY_LIMIT || 20);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const [w, s] = await Promise.all([
    sb!.from("writing_submissions").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
    sb!.from("speaking_attempts").select("id", { count: "exact", head: true }).gte("created_at", since.toISOString()),
  ]);
  if ((w.count ?? 0) + (s.count ?? 0) >= limit) throw new HttpError(429, `You've reached today's limit of ${limit} AI analyses. It resets at midnight UTC.`);
  return { sb: sb!, userId: data.user.id };
}

let client: Anthropic | null = null;
/** Generous timeout (long essays produce long feedback); the SDK retries 429/5xx/network errors itself. */
const anthropic = () => (client ??= new Anthropic({ timeout: Number(process.env.AI_TIMEOUT_MS || 240_000), maxRetries: Number(process.env.AI_MAX_RETRIES ?? 2) }));

export async function analyse<T extends z.ZodType>(schema: T, system: string, user: string, maxTokens = 12000): Promise<z.infer<T>> {
  const msg = await anthropic().messages.parse({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema as never) },
  });
  if (msg.stop_reason === "max_tokens") throw new HttpError(502, "The AI feedback was cut off because it was too long. Please try again.");
  if (!msg.parsed_output) throw new HttpError(502, "The AI response couldn't be read. Please try again.");
  return msg.parsed_output as z.infer<T>;
}

/** Drop references the model invented, so every link in the UI resolves. */
export function sanitiseRefs<F extends { issues: { quote: string; grammarRef: string | null }[]; vocabularyUpgrades: { senseRef: string | null }[]; collocations?: { original: string }[] }>(fb: F, source: string): F {
  const g = grammarCatalogue().ids;
  const v = vocabularyList().ids;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const src = norm(source);
  return {
    ...fb,
    issues: fb.issues
      .filter((i) => i.quote && src.includes(norm(i.quote).replace(/[.,;:!?]+$/, "")))
      .map((i) => ({ ...i, grammarRef: i.grammarRef && g.has(i.grammarRef) ? i.grammarRef : null })),
    vocabularyUpgrades: fb.vocabularyUpgrades.map((u) => ({ ...u, senseRef: u.senseRef && v.has(u.senseRef) ? u.senseRef : null })),
    ...(fb.collocations ? { collocations: fb.collocations.filter((c) => c.original && src.includes(norm(c.original).replace(/[.,;:!?]+$/, ""))) } : {}),
  };
}

/** Turns any failure into a status + a message a learner can act on (details go to the server log). */
export function describeError(e: unknown): { status: number; error: string; retry: boolean } {
  if (e instanceof HttpError) return { status: e.status, error: e.message, retry: e.status >= 500 };
  if (e instanceof Anthropic.APIConnectionTimeoutError) { console.error("Anthropic timeout"); return { status: 504, error: "The AI service took too long to answer.", retry: true }; }
  if (e instanceof Anthropic.APIConnectionError) { console.error("Anthropic connection error", e.message); return { status: 503, error: "The server couldn't connect to the AI service.", retry: true }; }
  if (e instanceof Anthropic.APIError) {
    console.error("Anthropic API error", e.status, e.message);
    if (e.status === 401 || e.status === 403) return { status: 500, error: "The AI service rejected this server's API key. The site owner needs to check ANTHROPIC_API_KEY.", retry: false };
    if (e.status === 400) return { status: 502, error: "The AI service couldn't process this request. Please try again; if it keeps happening, the site owner should check the AI model setting (ANTHROPIC_MODEL).", retry: true };
    if (e.status === 429 || e.status === 529 || (e.status ?? 0) >= 500) return { status: 503, error: "The AI service is busy or temporarily unavailable.", retry: true };
    return { status: 502, error: "The AI service returned an error.", retry: true };
  }
  console.error(e);
  return { status: 500, error: "Something went wrong while analysing your work.", retry: true };
}
export function errorResponse(e: unknown) {
  const d = describeError(e);
  return Response.json({ error: d.error, retry: d.retry }, { status: d.status });
}
