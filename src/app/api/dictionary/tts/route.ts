import { ttsConfigured } from "@/lib/dictionary/server";

/**
 * Optional high-quality pronunciation (Google Cloud Text-to-Speech, neural voices).
 * Used only when no human recording exists for that accent. Requires GOOGLE_TTS_API_KEY.
 */
const VOICES = { uk: { languageCode: "en-GB", name: process.env.GOOGLE_TTS_VOICE_UK || "en-GB-Neural2-B" }, us: { languageCode: "en-US", name: process.env.GOOGLE_TTS_VOICE_US || "en-US-Neural2-J" } };
const cache = new Map<string, ArrayBuffer>();

export async function GET(req: Request) {
  if (!ttsConfigured()) return Response.json({ error: "Text-to-speech isn't configured." }, { status: 501 });
  const url = new URL(req.url);
  const text = (url.searchParams.get("text") ?? "").trim().slice(0, 60);
  const accent = url.searchParams.get("accent") === "us" ? "us" : "uk";
  if (!text || !/^[\p{L}\s'’-]+$/u.test(text)) return Response.json({ error: "Invalid text." }, { status: 400 });
  const key = `${accent}:${text.toLowerCase()}`;
  let audio = cache.get(key);
  if (!audio) {
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: { text }, voice: VOICES[accent], audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 } }),
    });
    if (!r.ok) { console.error("TTS failed", r.status); return Response.json({ error: "Pronunciation service unavailable." }, { status: 502 }); }
    const { audioContent } = (await r.json()) as { audioContent: string };
    audio = Uint8Array.from(Buffer.from(audioContent, "base64")).buffer;
    if (cache.size > 2000) cache.delete(cache.keys().next().value!);
    cache.set(key, audio);
  }
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=2592000, immutable" } });
}
