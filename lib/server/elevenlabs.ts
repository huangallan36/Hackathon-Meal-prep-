/**
 * Server-only ElevenLabs helpers. The key travels in the xi-api-key header and is
 * never logged; errors are reduced to status + error code.
 */
import type { VoiceOption, VoicesResponse } from "@/lib/types";

const API = "https://api.elevenlabs.io";
const VOICE_ID = /^[A-Za-z0-9]{10,40}$/;
const VOICE_CACHE_MS = 10 * 60 * 1000;
const VOICE_FAILURE_CACHE_MS = 60 * 1000;

/** Preferred premade voices, in order. The first six found are offered. */
const PREFERRED = ["Jessica", "George", "Bella", "Chris", "Charlie", "Lily", "Sarah", "Matilda", "Will", "Brian"];
const VOICE_COUNT = 6;

const PREVIEW = "https://storage.googleapis.com/eleven-public-prod/premade/voices";

/** Verified premade voices on this account (labels from the live API), used when the voices API is unreachable. */
export const FALLBACK_VOICES: VoiceOption[] = [
  {
    id: "cgSgspJ2msm6clMCkdW9",
    name: "Jessica",
    description: "Playful, Bright, Warm",
    gender: "female",
    accent: "american",
    previewUrl: `${PREVIEW}/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3`,
  },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, Captivating Storyteller", gender: "male", accent: "british" },
  {
    id: "hpp4J3VqNfWAUOO0d1Us",
    name: "Bella",
    description: "Professional, Bright, Warm",
    gender: "female",
    accent: "american",
    previewUrl: `${PREVIEW}/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3`,
  },
  {
    id: "iP95p4xoKVk53GoZ742B",
    name: "Chris",
    description: "Charming, Down-to-Earth",
    gender: "male",
    accent: "american",
    previewUrl: `${PREVIEW}/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3`,
  },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Deep, Confident, Energetic", gender: "male", accent: "australian" },
  {
    id: "pFZP5JQG7iQjIQuC4Bku",
    name: "Lily",
    description: "Velvety Actress",
    gender: "female",
    accent: "british",
    previewUrl: `${PREVIEW}/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3`,
  },
];

export const TTS_MAX_CHARS = 800;

function apiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null;
}

export function hasElevenLabsKey(): boolean {
  return apiKey() !== null;
}

export function isVoiceId(id: unknown): id is string {
  return typeof id === "string" && VOICE_ID.test(id);
}

/** ELEVENLABS_DEFAULT_VOICE_ID when valid, else Jessica. */
export function defaultVoiceId(): string {
  const env = process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim();
  return isVoiceId(env) ? env : FALLBACK_VOICES[0].id;
}

export function ttsModelId(): string {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || "eleven_flash_v2_5";
}

/** Trim + collapse whitespace and cap at a sentence boundary. Returns "" when nothing speakable is left. */
export function prepareTtsText(input: unknown): string {
  if (typeof input !== "string") return "";
  const text = input.replace(/\s+/g, " ").trim();
  if (text.length <= TTS_MAX_CHARS) return text;
  const cut = text.slice(0, TTS_MAX_CHARS);
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd > TTS_MAX_CHARS * 0.5) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : TTS_MAX_CHARS)}.`;
}

/**
 * Error code from an ElevenLabs error body: { detail: { code | status, message } },
 * or { detail: [{ type, msg }] } for 422 validation errors.
 */
export async function parseElevenLabsError(res: Response): Promise<{ status: number; code: string }> {
  let code = `http_${res.status}`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      const first = detail[0] as { type?: unknown } | undefined;
      code = typeof first?.type === "string" ? first.type : "validation_error";
    } else if (detail && typeof detail === "object") {
      const d = detail as { code?: unknown; status?: unknown };
      const c = d.code ?? d.status;
      if (typeof c === "string" && c) code = c;
    } else if (typeof detail === "string" && detail.length < 80) {
      code = detail;
    }
  } catch {
    // Non-JSON error body; keep the http status code.
  }
  return { status: res.status, code: code.replace(/[^\w.-]/g, "_").slice(0, 60) };
}

/* ------------------------------------------------------------------ */
/* Rate limit                                                          */
/* ------------------------------------------------------------------ */

const TTS_WINDOW_MS = 60_000;
/** A busy demo speaks maybe 10 lines a minute; this only stops loops and scripted abuse. */
const TTS_PER_WINDOW = 60;
const ttsHits = new Map<string, { start: number; count: number }>();

/** Best-effort client key (per server instance; good enough to protect the character quota). */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "local").slice(0, 64);
}

/** Fixed-window limiter for /api/tts. Returns false when this client should use the browser voice. */
export function allowTts(key: string, now = Date.now()): boolean {
  if (ttsHits.size > 500) {
    for (const [k, v] of ttsHits) if (now - v.start >= TTS_WINDOW_MS) ttsHits.delete(k);
  }
  const hit = ttsHits.get(key);
  if (!hit || now - hit.start >= TTS_WINDOW_MS) {
    ttsHits.set(key, { start: now, count: 1 });
    return true;
  }
  hit.count++;
  return hit.count <= TTS_PER_WINDOW;
}

/* ------------------------------------------------------------------ */
/* Text to speech                                                      */
/* ------------------------------------------------------------------ */

export interface TtsUpstream {
  ok: true;
  body: ReadableStream<Uint8Array>;
}
export interface TtsFailure {
  ok: false;
  status: number;
  code: string;
}

/**
 * Start a streaming TTS request. `headerTimeoutMs` caps time to first byte;
 * `totalTimeoutMs` caps the whole stream so a stalled upstream can't hang the route.
 */
export async function streamSpeech(
  text: string,
  voiceId: string,
  opts: { headerTimeoutMs?: number; totalTimeoutMs?: number; signal?: AbortSignal } = {},
): Promise<TtsUpstream | TtsFailure> {
  const key = apiKey();
  if (!key) return { ok: false, status: 503, code: "no_api_key" };

  const controller = new AbortController();
  const abort = () => controller.abort();
  opts.signal?.addEventListener("abort", abort, { once: true });
  const headerTimer = setTimeout(abort, opts.headerTimeoutMs ?? 10_000);
  const totalTimer = setTimeout(abort, opts.totalTimeoutMs ?? 30_000);
  const cleanup = () => {
    clearTimeout(headerTimer);
    clearTimeout(totalTimer);
    opts.signal?.removeEventListener("abort", abort);
  };

  try {
    const res = await fetch(`${API}/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: ttsModelId(),
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 1.0 },
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(headerTimer);

    if (!res.ok || !res.body) {
      const err = res.ok ? { status: 502, code: "empty_body" } : await parseElevenLabsError(res);
      cleanup();
      return { ok: false, ...err };
    }

    // Pass the bytes through untouched; clear the timers when the stream ends either way.
    const body = res.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        flush: cleanup,
      }),
    );
    return { ok: true, body };
  } catch (err) {
    cleanup();
    const timedOut = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    return { ok: false, status: timedOut ? 504 : 502, code: timedOut ? "timeout" : "network_error" };
  }
}

/* ------------------------------------------------------------------ */
/* Voices                                                              */
/* ------------------------------------------------------------------ */

interface ElevenVoice {
  voice_id?: string;
  name?: string;
  preview_url?: string | null;
  description?: string | null;
  labels?: Record<string, string | undefined> | null;
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** "Jessica - Playful, Bright, Warm" -> { name: "Jessica", description: "Playful, Bright, Warm" } */
export function toVoiceOption(v: ElevenVoice): VoiceOption | null {
  if (!isVoiceId(v.voice_id) || !v.name) return null;
  const [rawName, ...rest] = v.name.split(" - ");
  const fromName = rest.join(" - ").trim();
  const labels = v.labels ?? {};
  const description =
    fromName ||
    (labels.descriptive ? titleCase(labels.descriptive) : "") ||
    (typeof v.description === "string" ? v.description.slice(0, 80) : "") ||
    (labels.use_case ? titleCase(labels.use_case) : "");
  return {
    id: v.voice_id,
    name: rawName.trim(),
    description,
    previewUrl: typeof v.preview_url === "string" && v.preview_url.startsWith("https://") ? v.preview_url : undefined,
    gender: labels.gender || undefined,
    accent: labels.accent || undefined,
  };
}

/** Pick VOICE_COUNT voices by first-name preference, topping up with whatever else is available. */
export function pickVoices(all: VoiceOption[]): VoiceOption[] {
  const byName = new Map<string, VoiceOption>();
  for (const v of all) if (!byName.has(v.name.toLowerCase())) byName.set(v.name.toLowerCase(), v);
  const picked: VoiceOption[] = [];
  for (const name of PREFERRED) {
    const v = byName.get(name.toLowerCase());
    if (v && picked.length < VOICE_COUNT) picked.push(v);
  }
  for (const v of all) {
    if (picked.length >= VOICE_COUNT) break;
    if (!picked.some((p) => p.id === v.id)) picked.push(v);
  }
  return picked;
}

let voiceCache: { at: number; ttl: number; data: VoicesResponse } | null = null;
let inflight: Promise<VoicesResponse> | null = null;

async function fetchVoices(): Promise<VoicesResponse> {
  const key = apiKey();
  if (!key) return { voices: FALLBACK_VOICES, source: "fallback" };
  try {
    const res = await fetch(`${API}/v2/voices?voice_type=default&page_size=100`, {
      headers: { "xi-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      const { status, code } = await parseElevenLabsError(res);
      console.warn(`[elevenlabs:voices] ${status} ${code}`);
      return { voices: FALLBACK_VOICES, source: "fallback" };
    }
    const json = (await res.json()) as { voices?: ElevenVoice[] };
    const voices = pickVoices((json.voices ?? []).map(toVoiceOption).filter((v): v is VoiceOption => v !== null));
    if (voices.length === 0) return { voices: FALLBACK_VOICES, source: "fallback" };
    return { voices, source: "elevenlabs" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "error";
    console.warn(`[elevenlabs:voices] ${name === "TimeoutError" || name === "AbortError" ? "timeout" : "network error"}`);
    return { voices: FALLBACK_VOICES, source: "fallback" };
  }
}

/** Voice list with a 10 minute in-memory cache (1 minute after a failure). Never throws. */
export async function getVoices(): Promise<VoicesResponse> {
  if (voiceCache && Date.now() - voiceCache.at < voiceCache.ttl) return voiceCache.data;
  inflight ??= fetchVoices()
    .then((data) => {
      voiceCache = { at: Date.now(), ttl: data.source === "elevenlabs" ? VOICE_CACHE_MS : VOICE_FAILURE_CACHE_MS, data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
