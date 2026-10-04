/**
 * POST /api/tts (TtsRequest) -> audio/mpeg stream from ElevenLabs.
 * On any failure returns JSON TtsError { error, fallback: true } with a non-200
 * status so the client switches to browser speechSynthesis.
 */
import { speakable } from "@/lib/intents";
import { defaultVoiceId, isVoiceId, prepareTtsText, streamSpeech } from "@/lib/server/elevenlabs";
import type { TtsError } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_CHARS = 8_000;

function fail(error: string, status: number): Response {
  const body: TtsError = { error, fallback: true };
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return fail("text_too_long", 413);

    let body: { text?: unknown; voiceId?: unknown };
    try {
      body = JSON.parse(raw) as typeof body;
    } catch {
      return fail("invalid_json", 400);
    }
    if (!body || typeof body !== "object") return fail("invalid_body", 400);

    // Spell out digits/units so the voice reads "350°F" naturally, then cap at a sentence.
    const text = prepareTtsText(typeof body.text === "string" ? speakable(body.text.slice(0, 4000)) : "");
    if (!text) return fail("empty_text", 400);
    const voiceId = isVoiceId(body.voiceId) ? body.voiceId : defaultVoiceId();

    const started = Date.now();
    const upstream = await streamSpeech(text, voiceId, {
      headerTimeoutMs: 10_000,
      totalTimeoutMs: 25_000,
      signal: request.signal,
    });
    if (!upstream.ok) {
      console.warn(`[tts] elevenlabs ${upstream.status} ${upstream.code} after ${Date.now() - started}ms`);
      return fail(upstream.code, upstream.code === "no_api_key" ? 503 : 502);
    }
    console.info(`[tts] ${text.length} chars, first byte in ${Date.now() - started}ms`);

    return new Response(upstream.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error(`[tts] ${err instanceof Error ? err.name : "error"}`);
    return fail("tts_failed", 502);
  }
}
