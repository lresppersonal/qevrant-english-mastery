import { z } from "zod";
import { getWritingPrompt } from "@/lib/content";
import { WritingFeedback, countWords, bandEstimate, repetitionStats } from "@/lib/ai/schemas";
import { writingSystem, writingUser } from "@/lib/ai/prompts";
import { authorise, analyse, sanitiseRefs, errorResponse, HttpError, AI_MODEL } from "@/lib/ai/server";

export const maxDuration = 60;

const Body = z.object({
  promptSlug: z.string(),
  body: z.string().max(12000),
  secondsSpent: z.number().int().nonnegative().max(60 * 60 * 6).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request.");
    const { promptSlug, body, secondsSpent } = parsed.data;
    const prompt = getWritingPrompt(promptSlug);
    if (!prompt) throw new HttpError(404, "Unknown writing task.");
    const words = countWords(body);
    if (words < 80) throw new HttpError(422, `Write at least 80 words before asking for feedback (you have ${words}).`);

    const { sb, userId } = await authorise();
    const raw = await analyse(WritingFeedback, writingSystem(), writingUser(prompt, body, words, repetitionStats(body)));
    const clean = sanitiseRefs(raw, body);
    const feedback = { ...clean, estimate: bandEstimate(clean.criteria) };

    let id: string = crypto.randomUUID();
    let createdAt = new Date().toISOString();
    if (sb && userId) {
      const { data, error } = await sb.from("writing_submissions")
        .insert({ user_id: userId, prompt_slug: promptSlug, body, word_count: words, seconds_spent: secondsSpent ?? null, feedback, model: AI_MODEL })
        .select("id, created_at").single();
      if (error) throw new HttpError(500, "Your feedback was generated but couldn't be saved.");
      id = data.id; createdAt = data.created_at;
      await sb.from("activity_events").insert({ user_id: userId, type: "writing_submitted", content_type: "writing", content_ref: promptSlug, payload: { words } });
    }
    return Response.json({ submission: { id, promptSlug, body, wordCount: words, secondsSpent: secondsSpent ?? null, feedback, createdAt }, persisted: !!sb });
  } catch (e) {
    return errorResponse(e);
  }
}
