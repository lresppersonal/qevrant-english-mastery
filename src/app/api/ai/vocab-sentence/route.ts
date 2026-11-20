import { z } from "zod";
import { getSense } from "@/lib/content";
import { usesItem } from "@/lib/vocab-context";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { describeError, structured, aiConfigured } from "@/lib/ai/server";

/**
 * Vocabulary in Context, "active production": feedback on a learner's own sentence with a target
 * item. The item is looked up on the server; the AI judges meaning, grammar and collocation and
 * suggests a natural version. Daily limit per learner.
 */
export const maxDuration = 60;
const Body = z.object({ senseId: z.string().min(1).max(120), sentence: z.string().min(3).max(400) });
const Out = z.object({
  verdict: z.enum(["natural", "understandable", "incorrect"]).describe("natural = correct and idiomatic; understandable = correct meaning but awkward or with a small error; incorrect = wrong meaning or serious error"),
  meaning: z.string().describe("Is the item used with the right meaning? One or two sentences."),
  grammarAndCollocation: z.string().describe("Grammar, word form and collocation of the item in this sentence. One or two sentences."),
  improved: z.string().describe("A corrected, natural version of the learner's sentence that keeps their idea"),
  tip: z.string().describe("One short, practical tip for using this item"),
});
const usage = new Map<string, { day: string; n: number }>();

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const ref = getSense(parsed.data.senseId);
  if (!ref) return Response.json({ error: "Unknown vocabulary item." }, { status: 404 });
  if (!usesItem(ref, parsed.data.sentence)) return Response.json({ error: `Your sentence doesn't contain “${ref.item.lemma}” yet.` }, { status: 422 });
  if (!aiConfigured()) return Response.json({ error: "AI feedback isn't configured on this server." }, { status: 503 });
  let user = "demo";
  if (isDemoMode) { if (process.env.AI_DEMO_ALLOW !== "true") return Response.json({ error: "AI feedback needs an account." }, { status: 401 }); }
  else {
    const sb = await supabaseServer();
    const { data } = await sb!.auth.getUser();
    if (!data.user) return Response.json({ error: "Please sign in." }, { status: 401 });
    user = data.user.id;
  }
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(user);
  if (u && u.day === day && u.n >= Number(process.env.VOCAB_SENTENCE_DAILY_LIMIT || 100)) return Response.json({ error: "You've reached today's limit for sentence feedback." }, { status: 429 });
  usage.set(user, { day, n: u && u.day === day ? u.n + 1 : 1 });
  try {
    const { item, sense } = ref;
    const out = await structured(Out, "You are an experienced teacher of advanced English vocabulary (B2–C2) for adult learners whose first language is Russian. Judge a learner's sentence that uses a target word or expression. Be precise and encouraging; do not invent rules; accept any natural British or American usage. Use British English in your explanations.", `Target: ${item.lemma} (${item.pos}, ${sense.level}, ${sense.register})\nMeaning: ${sense.definition}\nCommon collocations: ${sense.collocations.join("; ") || "—"}\nModel example: ${sense.examples[0]}\nLearner's sentence: ${parsed.data.sentence}`, { maxTokens: 600, fast: true, timeoutMs: 30_000 });
    return Response.json({ feedback: out });
  } catch (e) {
    const d = describeError(e);
    return Response.json({ error: d.error, retry: d.retry }, { status: d.status });
  }
}
