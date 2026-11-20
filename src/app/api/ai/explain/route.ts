import { z } from "zod";
import { exercises, ruleSummary } from "@/lib/content";
import { isDemoMode } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { describeError, structured, aiConfigured } from "@/lib/ai/server";

/**
 * "Explain my mistake": a short AI explanation of why the learner's own answer doesn't fit,
 * written for that exact answer. The question, options and key come from our content (never
 * from the request), so the AI can't be fed a different question.
 */
export const maxDuration = 60;
const Body = z.object({ exerciseSlug: z.string().max(120).optional(), questionId: z.string().min(1).max(200), answer: z.union([z.string().max(400), z.number().int().min(0).max(10)]) });
const Out = z.object({
  whyWrong: z.string().describe("Why the learner's answer is incorrect or unsuitable in THIS context (2-3 sentences, B2-friendly)"),
  whyCorrect: z.string().describe("Why the correct answer works here"),
  rule: z.string().describe("One short rule to remember"),
  example: z.string().describe("One new, natural example sentence that follows the rule"),
});
const cache = new Map<string, z.infer<typeof Out>>();
const usage = new Map<string, { day: string; n: number }>();

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (!aiConfigured()) return Response.json({ error: "AI explanations aren't configured on this server." }, { status: 503 });
  let user = "demo";
  if (isDemoMode) { if (process.env.AI_DEMO_ALLOW !== "true") return Response.json({ error: "AI explanations need an account." }, { status: 401 }); }
  else {
    const sb = await supabaseServer();
    const { data } = await sb!.auth.getUser();
    if (!data.user) return Response.json({ error: "Please sign in." }, { status: 401 });
    user = data.user.id;
  }
  const { answer } = parsed.data;
  // Question ids are unique only within an exercise: smart sets send "exercise-slug/q1", normal exercises send the slug separately.
  const [exSlug, questionId] = parsed.data.questionId.includes("/") ? parsed.data.questionId.split("/", 2) : [parsed.data.exerciseSlug ?? "", parsed.data.questionId];
  const ex = exercises.find((e) => e.slug === exSlug);
  const q = ex?.questions.find((x) => x.id === questionId);
  if (!ex || !q) return Response.json({ error: "Unknown question." }, { status: 404 });
  const learner = q.kind === "choice" ? (typeof answer === "number" ? q.options[answer] : String(answer)) : String(answer);
  const correct = q.kind === "choice" ? q.options[q.answer] : q.accepted.join(" / ");
  const key = `${exSlug}/${questionId}|${String(learner).toLowerCase().trim()}`;
  if (cache.has(key)) return Response.json({ explanation: cache.get(key) });

  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(user);
  if (u && u.day === day && u.n >= Number(process.env.EXPLAIN_DAILY_LIMIT || 150)) return Response.json({ error: "You've reached today's limit for AI explanations." }, { status: 429 });
  usage.set(user, { day, n: u && u.day === day ? u.n + 1 : 1 });

  const rule = q.theoryAnchor ? ruleSummary(q.theoryAnchor.lesson, q.theoryAnchor.section) : null;
  try {
    const out = await structured(Out, "You are an experienced teacher of advanced English grammar for adult learners (B2–C2) whose first language is Russian. Explain the learner's specific mistake clearly and kindly. Be precise about grammar; do not invent rules; if the learner's answer is acceptable in another context, say in which context. Use British English.", `Exercise: ${ex.title}\nQuestion: ${q.prompt}\n${q.kind === "choice" ? `Options: ${q.options.join(" | ")}\n` : ""}Correct answer: ${correct}\nLearner's answer: ${learner}\nTeacher's explanation of the key: ${q.explanation}\n${rule ? `Rule from the lesson: ${rule}\n` : ""}`, { maxTokens: 700, fast: true, timeoutMs: 30_000 });
    cache.set(key, out);
    if (cache.size > 5000) cache.delete(cache.keys().next().value!);
    return Response.json({ explanation: out });
  } catch (e) {
    const d = describeError(e);
    return Response.json({ error: d.error, retry: d.retry }, { status: d.status });
  }
}
