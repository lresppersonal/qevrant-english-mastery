import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/supabase/config";
import { grammarCatalogue, vocabularyList } from "./prompts";

import { z as zod } from "zod";

/**
 * Two interchangeable back ends for every AI feature:
 * - "huggingface" (AI_PROVIDER=huggingface): an open-weights model through any OpenAI-compatible
 *   chat-completions API. Defaults to the Hugging Face router; point AI_BASE_URL at your own
 *   Inference Endpoint or vLLM/TGI server to use a model you fine-tuned yourself.
 * - "anthropic" (default): Claude, when ANTHROPIC_API_KEY is set.
 */
export const AI_PROVIDER = (process.env.AI_PROVIDER || (process.env.HF_TOKEN && !process.env.ANTHROPIC_API_KEY ? "huggingface" : "anthropic")).toLowerCase();
const OPEN = AI_PROVIDER === "huggingface" || AI_PROVIDER === "openai-compatible";
const OPEN_BASE = (process.env.AI_BASE_URL || "https://router.huggingface.co/v1").replace(/\/$/, "");
const OPEN_KEY = process.env.HF_TOKEN || process.env.AI_API_KEY || "";
export const AI_MODEL = OPEN ? (process.env.AI_OPEN_MODEL || "openai/gpt-oss-120b:cheapest") : (process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");
export const AI_FAST_MODEL = OPEN ? (process.env.AI_OPEN_FAST_MODEL || AI_MODEL) : (process.env.DICTIONARY_AI_MODEL || "claude-haiku-5-5");
export const aiConfigured = () => (OPEN ? !!OPEN_KEY : !!process.env.ANTHROPIC_API_KEY);
export const aiProviderLabel = () => (OPEN ? `open model ${AI_MODEL}` : `Claude ${AI_MODEL}`);
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

/** An error from the open-model API, shaped like the Anthropic SDK's so describeError treats both alike. */
class OpenApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function openChat(body: Record<string, unknown>, timeoutMs: number) {
  const retries = Number(process.env.AI_MAX_RETRIES ?? 2);
  for (let attempt = 0; ; attempt++) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(`${OPEN_BASE}/chat/completions`, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPEN_KEY}` }, body: JSON.stringify(body) });
      if (r.ok) return (await r.json()) as { choices: { message: { content: string | null }; finish_reason: string }[] };
      const text = (await r.text()).slice(0, 400);
      if ((r.status === 429 || r.status >= 500) && attempt < retries) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); continue; }
      throw new OpenApiError(r.status, text);
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new OpenApiError(504, "timeout");
      if (e instanceof OpenApiError) throw e;
      if (attempt < retries) continue;
      throw new OpenApiError(503, (e as Error).message);
    } finally { clearTimeout(timer); }
  }
}

/** Pull the first JSON object out of a model's reply (open models sometimes wrap it in prose or code fences). */
function extractJson(text: string): unknown {
  const t = text.replace(/^[\s\S]*?```(?:json)?\s*/i, (m) => (m.includes("```") ? "" : m)).replace(/```[\s\S]*$/, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? t.slice(a, b + 1) : t);
}

/** Structured answer from an open model: JSON-schema mode where the provider supports it, plain JSON otherwise; validated with zod, one repair attempt. */
async function openStructured<T extends z.ZodType>(schema: T, system: string, user: string, maxTokens: number, model: string, timeoutMs: number): Promise<z.infer<T>> {
  const json = zod.toJSONSchema(schema as never, { target: "draft-7" }) as Record<string, unknown>;
  const sys = `${system}\n\nReply with ONE JSON object only, no prose, matching this JSON Schema:\n${JSON.stringify(json)}`;
  const messages: { role: string; content: string }[] = [{ role: "system", content: sys }, { role: "user", content: user }];
  let useSchema = process.env.AI_JSON_SCHEMA !== "false";
  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await openChat({ model, messages, max_tokens: maxTokens, temperature: 0.2, response_format: useSchema ? { type: "json_schema", json_schema: { name: "feedback", schema: json, strict: false } } : { type: "json_object" } }, timeoutMs);
    } catch (e) {
      if (useSchema && e instanceof OpenApiError && (e.status === 400 || e.status === 422)) { useSchema = false; attempt--; continue; }   // provider without schema mode
      throw e;
    }
    const choice = res.choices?.[0]; const text = choice?.message?.content ?? "";
    if (choice?.finish_reason === "length") throw new HttpError(502, "The AI feedback was cut off because it was too long. Please try again.");
    try {
      const parsed = (schema as z.ZodType).safeParse(extractJson(text));
      if (parsed.success) return parsed.data as z.infer<T>;
      messages.push({ role: "assistant", content: text }, { role: "user", content: `That JSON does not match the schema: ${parsed.error.issues.slice(0, 6).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Reply again with the corrected JSON object only.` });
    } catch {
      messages.push({ role: "assistant", content: text }, { role: "user", content: "That was not valid JSON. Reply again with the JSON object only." });
    }
  }
  throw new HttpError(502, "The AI response couldn't be read. Please try again.");
}

/** One structured call for every AI feature, whichever back end is configured. */
export async function structured<T extends z.ZodType>(schema: T, system: string, user: string, o: { maxTokens?: number; fast?: boolean; timeoutMs?: number } = {}): Promise<z.infer<T>> {
  const maxTokens = o.maxTokens ?? 12000, model = o.fast ? AI_FAST_MODEL : AI_MODEL;
  const timeoutMs = o.timeoutMs ?? Number(process.env.AI_TIMEOUT_MS || 240_000);
  if (OPEN) return openStructured(schema, system, user, maxTokens, model, timeoutMs);
  const msg = await anthropic().messages.parse({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }], output_config: { format: zodOutputFormat(schema as never) } });
  if (msg.stop_reason === "max_tokens") throw new HttpError(502, "The AI feedback was cut off because it was too long. Please try again.");
  if (!msg.parsed_output) throw new HttpError(502, "The AI response couldn't be read. Please try again.");
  return msg.parsed_output as z.infer<T>;
}

export async function analyse<T extends z.ZodType>(schema: T, system: string, user: string, maxTokens = 12000): Promise<z.infer<T>> {
  if (OPEN) return structured(schema, system, user, { maxTokens });
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
  if (e instanceof OpenApiError) {
    console.error("Open model API error", e.status, e.message);
    if (e.status === 401 || e.status === 403) return { status: 500, error: "The AI service rejected this server's access token. The site owner needs to check HF_TOKEN.", retry: false };
    if (e.status === 402) return { status: 503, error: "The free monthly AI allowance for this site is used up. It renews next month.", retry: false };
    if (e.status === 404 || e.status === 400 || e.status === 422) return { status: 502, error: "The AI model couldn't process this request. The site owner should check the model setting (AI_OPEN_MODEL).", retry: true };
    if (e.status === 504) return { status: 504, error: "The AI service took too long to answer.", retry: true };
    return { status: 503, error: "The AI service is busy or temporarily unavailable.", retry: true };
  }
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
