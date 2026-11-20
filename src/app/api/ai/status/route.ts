import { z } from "zod";
import { aiConfigured, aiProviderLabel, describeError, structured, transcriptionConfigured } from "@/lib/ai/server";
import { isDemoMode } from "@/lib/supabase/config";
import { ttsConfigured } from "@/lib/dictionary/server";

export const dynamic = "force-dynamic";

/** Lets the UI explain honestly what is available, instead of showing controls that fail. */
// A real round trip to the model, at most once per 10 minutes, so the owner can verify the connection.
let lastCheck: { at: number; ok: boolean; detail: string } | null = null;
async function liveCheck() {
  if (lastCheck && Date.now() - lastCheck.at < 600_000) return lastCheck;
  try {
    const r = await structured(z.object({ correct: z.boolean(), fix: z.string() }), "You check one English sentence. Answer in JSON.", 'Is this sentence grammatical: "She have lived here since 2019."', { maxTokens: 300, fast: true, timeoutMs: 45_000 });
    lastCheck = { at: Date.now(), ok: r.correct === false, detail: `model answered: correct=${r.correct}, fix="${r.fix}"` };
  } catch (e) { lastCheck = { at: Date.now(), ok: false, detail: describeError(e).error }; }
  return lastCheck;
}

export async function GET(req: Request) {
  const check = new URL(req.url).searchParams.get("check") === "1" && aiConfigured() ? await liveCheck() : undefined;
  const enabled = aiConfigured() && (!isDemoMode || process.env.AI_DEMO_ALLOW === "true");
  let reason: string | null = null;
  if (!aiConfigured()) reason = "AI feedback isn't configured on this server yet (no AI model connected).";
  else if (!enabled) reason = "AI feedback needs an account, so it is switched off in Demo mode.";
  return Response.json({ enabled, reason, transcription: transcriptionConfigured() ? "server" : "browser", tts: ttsConfigured(), dictionaryAi: enabled, provider: aiConfigured() ? aiProviderLabel() : null, ...(check ? { check: { ok: check.ok, detail: check.detail } } : {}) });
}
