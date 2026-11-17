import { z } from "zod";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { lookupWord, explainInContext, DictionaryUnavailable, dictionaryAiConfigured } from "@/lib/dictionary/server";

export const maxDuration = 60;
const Body = z.object({ word: z.string().min(1).max(60), sentence: z.string().max(1200).default(""), explain: z.boolean().optional(), entry: z.any().optional() });

// Per-user daily cap on AI dictionary calls (cached and local results are free and unlimited).
const usage = new Map<string, { day: string; n: number }>();
const LIMIT = Number(process.env.DICTIONARY_AI_DAILY_LIMIT || 300);
function allowAi(user: string) {
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(user);
  if (!u || u.day !== day) { usage.set(user, { day, n: 1 }); return true; }
  if (u.n >= LIMIT) return false;
  u.n++; return true;
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { word, sentence, explain, entry } = parsed.data;
  if (!/[\p{L}]/u.test(word)) return Response.json({ error: "Not a word." }, { status: 400 });

  let user = "demo";
  let aiAllowed = !isDemoMode || process.env.AI_DEMO_ALLOW === "true";
  if (!isDemoMode) {
    const sb = await supabaseServer();
    const { data } = await sb!.auth.getUser();
    if (!data.user) return Response.json({ error: "Please sign in to use the dictionary." }, { status: 401 });
    user = data.user.id;
  }
  try {
    if (explain) {
      if (!dictionaryAiConfigured() || !aiAllowed) return Response.json({ error: "Explanations in context need the AI service, which isn't configured here." }, { status: 503 });
      if (!allowAi(user)) return Response.json({ error: "You've reached today's limit for AI dictionary explanations." }, { status: 429 });
      return Response.json({ explanation: await explainInContext(entry, sentence) });
    }
    aiAllowed = aiAllowed && allowAi(user);
    const result = await lookupWord(word, sentence, { allowAi: aiAllowed });
    return Response.json({ entry: result });
  } catch (e) {
    if (e instanceof DictionaryUnavailable) {
      console.error("dictionary unavailable", e.message);
      return Response.json({ error: "The online dictionary didn't respond. Please try again in a moment.", retry: true }, { status: 503 });
    }
    console.error(e);
    return Response.json({ error: "Something went wrong while looking up this word.", retry: true }, { status: 500 });
  }
}
