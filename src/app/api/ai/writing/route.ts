import { z } from "zod";
import { getWritingPrompt } from "@/lib/content";
import { WritingFeedback, VisualFeedback, countWords, bandEstimate, repetitionStats } from "@/lib/ai/schemas";
import { writingSystem, writingUser, visualSystem, visualUser } from "@/lib/ai/prompts";
import { visualFromSlug } from "@/lib/visual";
import { authorise, analyse, sanitiseRefs, describeError, HttpError, AI_MODEL } from "@/lib/ai/server";

// Long essays produce long, detailed feedback: allow up to 5 minutes (Vercel's limit with Fluid compute).
export const maxDuration = 300;

const Body = z.object({
  promptSlug: z.string(),
  body: z.string().max(12000).optional(),
  secondsSpent: z.number().int().nonnegative().max(60 * 60 * 6).nullable().optional(),
  /** Generated once per click in the browser; retries reuse it so an essay is never submitted twice. */
  requestId: z.string().uuid().optional(),
  /** Retry the assessment of an essay that is already saved. */
  submissionId: z.string().uuid().optional(),
});

// Demo mode has no database: remember finished results briefly so a repeated request isn't assessed twice.
const recent = new Map<string, unknown>();

type Row = { id: string; prompt_slug: string; body: string; word_count: number; seconds_spent: number | null; feedback: unknown; created_at: string; status: string; error: string | null; updated_at?: string };
const toSubmission = (r: Row) => ({ id: r.id, promptSlug: r.prompt_slug, body: r.body, wordCount: r.word_count, secondsSpent: r.seconds_spent, feedback: r.feedback, createdAt: r.created_at, status: r.status, error: r.error });

export async function POST(req: Request) {
  let saved: Row | null = null;
  let sbRef: Awaited<ReturnType<typeof authorise>>["sb"] = null;
  try {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid request.");
    const { promptSlug, secondsSpent, requestId, submissionId } = parsed.data;
    // Essays come from the essay bank; "visual:<id>" tasks are regenerated from their id, so the data
    // the AI checks against is exactly the figure the learner saw.
    const prompt = getWritingPrompt(promptSlug);
    const visual = prompt ? null : visualFromSlug(promptSlug);
    if (!prompt && !visual) throw new HttpError(404, "Unknown writing task.");

    const { sb, userId } = await authorise();
    sbRef = sb;
    let body = parsed.data.body ?? "";

    if (sb && userId) {
      if (submissionId) {
        // Retry: the essay text comes from the saved row, not the request.
        const { data } = await sb.from("writing_submissions").select("*").eq("id", submissionId).maybeSingle();
        if (!data) throw new HttpError(404, "That saved essay wasn't found.");
        saved = data as Row;
        if (saved.status === "assessed") return Response.json({ submission: toSubmission(saved), persisted: true });
        const stale = Date.now() - Date.parse(saved.updated_at ?? saved.created_at) > 6 * 60_000;
        if (saved.status === "pending" && !stale) throw new HttpError(409, "This essay is already being assessed. Please wait a moment.");
        body = saved.body;
      } else if (requestId) {
        const { data } = await sb.from("writing_submissions").select("*").eq("client_request_id", requestId).maybeSingle();
        if (data) {
          const row = data as Row;
          if (row.status === "assessed") return Response.json({ submission: toSubmission(row), persisted: true });
          if (row.status === "pending" && Date.now() - Date.parse(row.updated_at ?? row.created_at) < 6 * 60_000) throw new HttpError(409, "This essay is already being assessed. Please wait a moment.");
          saved = row; body = row.body;
        }
      }
    } else if (requestId && recent.has(requestId)) {
      return Response.json(recent.get(requestId));
    }

    const words = countWords(body);
    if (words < 80) throw new HttpError(422, `Write at least 80 words before asking for feedback (you have ${words}).`);

    // 1. Save the essay first, so it survives any AI failure.
    if (sb && userId && !saved) {
      const { data, error } = await sb.from("writing_submissions")
        .insert({ user_id: userId, prompt_slug: promptSlug, body, word_count: words, seconds_spent: secondsSpent ?? null, status: "pending", client_request_id: requestId ?? null, model: AI_MODEL })
        .select("*").single();
      if (error) {
        console.error("essay insert failed", error.message);
        throw new HttpError(500, "Your essay couldn't be saved to your account. It is still saved on this device; please try again.");
      }
      saved = data as Row;
    } else if (sb && saved) {
      await sb.from("writing_submissions").update({ status: "pending", error: null, updated_at: new Date().toISOString() }).eq("id", saved.id);
    }

    // 2. Assess it.
    const raw = visual
      ? await analyse(VisualFeedback, visualSystem(), visualUser(visual, body, words, repetitionStats(body)))
      : await analyse(WritingFeedback, writingSystem(prompt!.topics), writingUser(prompt!, body, words, repetitionStats(body)));
    const clean = sanitiseRefs(raw, body);
    const feedback = { ...clean, estimate: bandEstimate(clean.criteria) };

    // 3. Store the feedback with the essay.
    if (sb && userId && saved) {
      const { data, error } = await sb.from("writing_submissions").update({ feedback, status: "assessed", error: null, updated_at: new Date().toISOString(), model: AI_MODEL }).eq("id", saved.id).select("*").single();
      if (error) throw new HttpError(500, "Your feedback was generated but couldn't be saved. Please retry.");
      await sb.from("activity_events").insert({ user_id: userId, type: "writing_submitted", content_type: "writing", content_ref: promptSlug, payload: { words, band: feedback.estimate?.mean ?? null } });
      return Response.json({ submission: toSubmission(data as Row), persisted: true });
    }
    const result = { submission: { id: crypto.randomUUID(), promptSlug, body, wordCount: words, secondsSpent: secondsSpent ?? null, feedback, createdAt: new Date().toISOString(), status: "assessed" }, persisted: false };
    if (requestId) { recent.set(requestId, result); if (recent.size > 200) recent.delete(recent.keys().next().value!); }
    return Response.json(result);
  } catch (e) {
    const d = describeError(e);
    // Keep the saved essay and mark it as retryable.
    if (sbRef && saved && d.status !== 409) {
      await sbRef.from("writing_submissions").update({ status: "failed", error: d.error, updated_at: new Date().toISOString() }).eq("id", saved.id).then(() => {}, () => {});
      saved = { ...saved, status: "failed", error: d.error };
    }
    return Response.json({ error: d.error, retry: d.retry, submission: saved ? toSubmission(saved) : null }, { status: d.status });
  }
}
