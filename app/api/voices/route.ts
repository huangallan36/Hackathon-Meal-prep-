/**
 * GET /api/voices -> VoicesResponse. Six premade ElevenLabs voices, the four personas'
 * (Maya, Leo, Nova, Brock) first, cached in memory for 10 minutes. Falls back to a verified
 * static list.
 */
import { FALLBACK_VOICES, getVoices } from "@/lib/server/elevenlabs";
import type { VoicesResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 10;
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const data = await getVoices();
    return Response.json(data, {
      headers: { "Cache-Control": data.source === "elevenlabs" ? "private, max-age=600" : "no-store" },
    });
  } catch {
    const body: VoicesResponse = { voices: FALLBACK_VOICES, source: "fallback" };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  }
}
