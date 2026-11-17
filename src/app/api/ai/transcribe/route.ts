import { authorise, errorResponse, HttpError, transcriptionConfigured } from "@/lib/ai/server";

export const maxDuration = 60;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Server-side speech-to-text (optional). Audio is forwarded to the transcription provider and
 * discarded, unless the learner opted in to keeping recordings, in which case it is stored in
 * their private folder in Supabase Storage.
 */
export async function POST(req: Request) {
  try {
    if (!transcriptionConfigured()) throw new HttpError(501, "Server transcription is not configured.");
    const { sb, userId } = await authorise();
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, "No audio received.");
    if (audio.size > MAX_BYTES) throw new HttpError(413, "Recording is too long.");

    const upstream = new FormData();
    upstream.append("file", audio, "answer.webm");
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-transcribe";
    // whisper-1 can return segment timestamps, which let us count long pauses; newer models return text only.
    const verbose = model.startsWith("whisper");
    upstream.append("model", model);
    upstream.append("language", "en");
    upstream.append("response_format", verbose ? "verbose_json" : "json");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: upstream,
    });
    if (!r.ok) {
      console.error("Transcription failed", r.status, await r.text().catch(() => ""));
      throw new HttpError(502, "Transcription failed. Please try again.");
    }
    const out = (await r.json()) as { text: string; segments?: { start: number; end: number }[] };
    const text = out.text;
    let longPauses: number | undefined;
    if (out.segments?.length) {
      longPauses = 0;
      for (let i = 1; i < out.segments.length; i++) if (out.segments[i].start - out.segments[i - 1].end > 1.5) longPauses++;
    }

    let audioPath: string | null = null;
    if (sb && userId) {
      const { data: profile } = await sb.from("profiles").select("audio_storage_opt_in").eq("id", userId).single();
      if (profile?.audio_storage_opt_in) {
        const path = `${userId}/${crypto.randomUUID()}.webm`;
        const { error } = await sb.storage.from("speaking-audio").upload(path, audio, { contentType: audio.type || "audio/webm" });
        if (!error) audioPath = path;
      }
    }
    return Response.json({ text, audioPath, longPauses });
  } catch (e) {
    return errorResponse(e);
  }
}
