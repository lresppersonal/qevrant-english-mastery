import { aiConfigured, transcriptionConfigured } from "@/lib/ai/server";
import { isDemoMode } from "@/lib/supabase/config";
import { ttsConfigured } from "@/lib/dictionary/server";

export const dynamic = "force-dynamic";

/** Lets the UI explain honestly what is available, instead of showing controls that fail. */
export function GET() {
  const enabled = aiConfigured() && (!isDemoMode || process.env.AI_DEMO_ALLOW === "true");
  let reason: string | null = null;
  if (!aiConfigured()) reason = "AI feedback isn't configured on this server yet (missing ANTHROPIC_API_KEY).";
  else if (!enabled) reason = "AI feedback needs an account, so it is switched off in Demo mode.";
  return Response.json({ enabled, reason, transcription: transcriptionConfigured() ? "server" : "browser", tts: ttsConfigured(), dictionaryAi: enabled });
}
