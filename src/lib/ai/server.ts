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
const anthropic = () => (client ??= new Anthropic());

export async function analyse<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const msg = await anthropic().messages.parse({
    model: AI_MODEL,
    max_tokens: 6000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(schema as never) },
  });
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

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Anthropic.APIError) {
    console.error("Anthropic API error", e.status, e.message);
    const status = e.status === 429 || e.status === 529 ? 503 : 502;
    return Response.json({ error: "The AI service is busy or unavailable. Please try again in a minute." }, { status });
  }
  console.error(e);
  return Response.json({ error: "Something went wrong while analysing your work." }, { status: 500 });
}
