import { z } from "zod";
import { getSpeakingPrompt } from "@/lib/content";
import { SpeakingFeedback, speechMetrics } from "@/lib/ai/schemas";
import { speakingSystem, speakingUser } from "@/lib/ai/prompts";
import { authorise, analyse, sanitiseRefs, errorResponse, HttpError, AI_MODEL } from "@/lib/ai/server";

export const maxDuration = 60;

const Body = z.object({
  promptSlug: z.string(),
  transcript: z.string().max(12000),
  durationSeconds: z.number().int().positive().max(900),
  audioPath: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request.");
    const { promptSlug, transcript, durationSeconds, audioPath } = parsed.data;
    const prompt = getSpeakingPrompt(promptSlug);
    if (!prompt) throw new HttpError(404, "Unknown speaking task.");
    const metrics = speechMetrics(transcript, durationSeconds);
    if (metrics.words < 25) throw new HttpError(422, `We only caught ${metrics.words} words. Speak for a little longer (at least 25 words) and try again.`);

    const { sb, userId } = await authorise();
    const raw = await analyse(SpeakingFeedback, speakingSystem(), speakingUser(prompt, transcript, metrics, durationSeconds));
    const feedback = sanitiseRefs(raw, transcript);

    let id: string = crypto.randomUUID();
    let createdAt = new Date().toISOString();
    if (sb && userId) {
      const safeAudio = audioPath && audioPath.startsWith(`${userId}/`) ? audioPath : null;
      const { data, error } = await sb.from("speaking_attempts")
        .insert({ user_id: userId, prompt_slug: promptSlug, transcript, duration_seconds: durationSeconds, metrics, feedback, audio_path: safeAudio, model: AI_MODEL })
        .select("id, created_at").single();
      if (error) throw new HttpError(500, "Your feedback was generated but couldn't be saved.");
      id = data.id; createdAt = data.created_at;
      await sb.from("activity_events").insert({ user_id: userId, type: "speaking_submitted", content_type: "speaking", content_ref: promptSlug, payload: { seconds: durationSeconds } });
    }
    return Response.json({ attempt: { id, promptSlug, transcript, durationSeconds, metrics, feedback, createdAt }, persisted: !!sb });
  } catch (e) {
    return errorResponse(e);
  }
}
