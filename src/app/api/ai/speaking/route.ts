import { z } from "zod";
import { getSpeakingPrompt } from "@/lib/content";
import { bankPrompt, categoryTitle, SPEAKING_MODES } from "@/lib/speaking-bank";
import { SpeakingFeedback, speechMetrics, bandEstimate, repetitionStats } from "@/lib/ai/schemas";
import { speakingSystem, speakingUser, taskFromPrompt, type SpeakingTask } from "@/lib/ai/prompts";
import { authorise, analyse, sanitiseRefs, errorResponse, HttpError, AI_MODEL } from "@/lib/ai/server";

export const maxDuration = 300;

// Which vocabulary themes to show the AI for each studio category (keeps the prompt small).
const CATEGORY_THEMES: Record<string, string[]> = { environment: ["environment", "nature-wildlife"], technology: ["science-technology", "communication-media"], business: ["business-finance", "economics-globalisation", "work-careers"], education: ["education"], academic: ["education"], society: ["society-politics", "arts-culture"], psychology: ["psychology-behaviour", "relationships-personality"], science: ["science-technology"], health: ["health-medicine", "sports-fitness"], global: ["society-politics", "economics-globalisation", "environment"], personal: ["relationships-personality", "everyday-life"], lifestyle: ["hobbies-leisure", "everyday-life", "food-nutrition"], travel: ["travel-tourism", "transport-movement"], media: ["communication-media"], work: ["work-careers"], general: ["everyday-life", "cities-urban"] };

const Body = z.object({
  promptSlug: z.string().optional(),
  bankId: z.string().optional(),
  mode: z.enum(["one", "two"]).optional(),
  transcript: z.string().max(12000),
  durationSeconds: z.number().int().positive().max(900),
  longPauses: z.number().int().nonnegative().max(500).optional(),
  audioPath: z.string().nullable().optional(),
});

const PRONUNCIATION = { assessed: false, note: "Pronunciation is not assessed: the feedback is based on a transcript, and no pronunciation-scoring service is configured." };

export async function POST(req: Request) {
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request.");
    const { promptSlug, bankId, mode, transcript, durationSeconds, longPauses, audioPath } = parsed.data;

    // The task text always comes from our own content, never from the client.
    let task: SpeakingTask; let storedSlug: string; let themes: string[] = [];
    if (bankId) {
      const b = bankPrompt(bankId);
      if (!b || !mode) throw new HttpError(404, "Unknown speaking topic.");
      const m = SPEAKING_MODES[mode];
      task = { title: categoryTitle(b.category), prompt: b.prompt, points: b.points, level: b.level, speakSeconds: m.speakSeconds, label: `${m.label} long turn` };
      storedSlug = `bank:${b.id}`;
      themes = CATEGORY_THEMES[b.category] ?? [];
      if (durationSeconds > m.speakSeconds + 15) throw new HttpError(400, "Recording is longer than this mode allows.");
    } else {
      const p = promptSlug ? getSpeakingPrompt(promptSlug) : undefined;
      if (!p) throw new HttpError(404, "Unknown speaking task.");
      task = taskFromPrompt(p); storedSlug = p.slug; themes = p.topics;
    }

    const metrics: Record<string, number> = { ...speechMetrics(transcript, durationSeconds), ...(longPauses !== undefined ? { longPauses } : {}), ...(mode ? { modeSeconds: SPEAKING_MODES[mode].speakSeconds } : {}) };
    if (metrics.words < 25) throw new HttpError(422, `We only caught ${metrics.words} words. Speak for a little longer (at least 25 words) and try again.`);

    const { sb, userId } = await authorise();
    const raw = await analyse(SpeakingFeedback, speakingSystem(themes.length ? themes : ["everyday-life"]), speakingUser(task, transcript, metrics, durationSeconds, repetitionStats(transcript)));
    const clean = sanitiseRefs(raw, transcript);
    const feedback = { ...clean, estimate: bandEstimate(clean.criteria), pronunciation: PRONUNCIATION };

    let id: string = crypto.randomUUID();
    let createdAt = new Date().toISOString();
    if (sb && userId) {
      const safeAudio = audioPath && audioPath.startsWith(`${userId}/`) ? audioPath : null;
      const { data, error } = await sb.from("speaking_attempts")
        .insert({ user_id: userId, prompt_slug: storedSlug, transcript, duration_seconds: durationSeconds, metrics, feedback, audio_path: safeAudio, model: AI_MODEL })
        .select("id, created_at").single();
      if (error) throw new HttpError(500, "Your feedback was generated but couldn't be saved.");
      id = data.id; createdAt = data.created_at;
      await sb.from("activity_events").insert({ user_id: userId, type: "speaking_submitted", content_type: "speaking", content_ref: storedSlug, payload: { seconds: durationSeconds, mode: mode ?? null, band: feedback.estimate?.mean ?? null } });
    }
    return Response.json({ attempt: { id, promptSlug: storedSlug, transcript, durationSeconds, metrics, feedback, createdAt }, persisted: !!sb });
  } catch (e) {
    return errorResponse(e);
  }
}
