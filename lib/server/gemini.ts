/**
 * Server-only Gemini helpers. Never import from a client component.
 *
 * Every call walks a model chain: Gemini Flash models regularly return 503
 * "high demand", so each attempt gets its own timeout and the next model takes
 * over on any error. Callers still need their own fallback when the whole
 * chain fails.
 */
import {
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ImageInput } from "@/lib/types";

/** Fast text + tool calling for voice turns and moderation */
export const CHAT_MODELS = uniq([process.env.GEMINI_CHAT_MODEL, "gemini-3.5-flash-lite", "gemini-3.7-flash"]);

/** Vision (fridge ingredients, meal nutrition) */
export const VISION_MODELS = uniq([
  process.env.GEMINI_VISION_MODEL,
  "gemini-3.7-flash",
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
]);

let client: GoogleGenAI | null = null;

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Thinking config per model family. Gemini 3.7/3.8 Flash reject "minimal";
 * Flash-Lite already defaults to minimal, so we leave it alone.
 */
function thinkingFor(model: string): GenerateContentConfig["thinkingConfig"] | undefined {
  if (/flash-lite/.test(model)) return undefined;
  if (/gemini-3\.(7|8)-flash/.test(model)) return { thinkingLevel: ThinkingLevel.LOW };
  if (/gemini-3\.[56]-flash/.test(model)) return { thinkingLevel: ThinkingLevel.MINIMAL };
  return undefined;
}

export interface GenerateOptions {
  models: string[];
  contents: Content[] | string;
  config?: Omit<GenerateContentConfig, "abortSignal" | "thinkingConfig">;
  /** Total budget across all models in the chain */
  timeoutMs: number;
  /** Per-attempt cap so one slow model can't eat the whole budget */
  attemptTimeoutMs?: number;
  /** Shows up in server logs */
  label: string;
}

export interface GenerateResult {
  response: GenerateContentResponse;
  model: string;
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const ai = getClient();
  const deadline = Date.now() + opts.timeoutMs;
  let lastError: unknown = null;

  for (const model of opts.models) {
    const remaining = deadline - Date.now();
    if (remaining < 400) break;
    const attemptMs = Math.min(remaining, opts.attemptTimeoutMs ?? remaining);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attemptMs);
    const started = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: opts.contents,
        config: { ...opts.config, thinkingConfig: thinkingFor(model), abortSignal: controller.signal },
      });
      console.info(`[gemini:${opts.label}] ${model} ok in ${Date.now() - started}ms`);
      return { response, model };
    } catch (err) {
      lastError = err;
      console.warn(`[gemini:${opts.label}] ${model} failed after ${Date.now() - started}ms: ${describeError(err)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error("Gemini timed out");
}

/** Concatenate text parts (skipping thoughts) without tripping the SDK's non-text-part warning. */
export function textOf(response: GenerateContentResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

/** Structured output: returns the parsed JSON object, throws if the chain fails or JSON is invalid. */
export async function generateJSON<T>(opts: {
  models: string[];
  parts: Part[];
  schema: Record<string, unknown>;
  systemInstruction?: string;
  timeoutMs: number;
  attemptTimeoutMs?: number;
  label: string;
}): Promise<{ data: T; model: string }> {
  const { response, model } = await generate({
    models: opts.models,
    contents: [{ role: "user", parts: opts.parts }],
    config: {
      systemInstruction: opts.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: opts.schema,
    },
    timeoutMs: opts.timeoutMs,
    attemptTimeoutMs: opts.attemptTimeoutMs,
    label: opts.label,
  });
  const raw = textOf(response);
  try {
    return { data: JSON.parse(raw) as T, model };
  } catch {
    // Occasionally wrapped in a code fence; strip and retry once.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return { data: JSON.parse(cleaned) as T, model };
  }
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS = new Set([
  "img.spoonacular.com",
  "spoonacular.com",
  "images.unsplash.com",
  "images.pexels.com",
]);

/**
 * Turn an ImageInput into a Gemini inline-data part.
 * - base64: used as-is (client already downscaled it)
 * - data: URL: decoded
 * - "/public-path": read from /public, or fetched from the request origin on Vercel
 * - https URL: fetched only from allow-listed hosts (prevents SSRF)
 */
export async function imagePart(input: ImageInput, requestUrl: string): Promise<Part> {
  if ("base64" in input) {
    const data = input.base64.replace(/^data:[^;]+;base64,/, "");
    if (data.length > (MAX_IMAGE_BYTES * 4) / 3) throw new Error("image too large");
    return { inlineData: { mimeType: input.mimeType || "image/jpeg", data } };
  }

  const url = input.url;
  const dataUrl = /^data:([^;]+);base64,(.+)$/.exec(url);
  if (dataUrl) {
    if (dataUrl[2].length > (MAX_IMAGE_BYTES * 4) / 3) throw new Error("image too large");
    return { inlineData: { mimeType: dataUrl[1], data: dataUrl[2] } };
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    const clean = path.normalize(url).replace(/^([/\\])+/, "");
    if (clean.includes("..")) throw new Error("bad image path");
    try {
      const buf = await readFile(path.join(process.cwd(), "public", clean));
      return { inlineData: { mimeType: mimeFromPath(clean), data: buf.toString("base64") } };
    } catch {
      // On Vercel /public is served by the CDN, not bundled with the function.
      return fetchImagePart(new URL(url, requestUrl).toString());
    }
  }

  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    throw new Error("image host not allowed");
  }
  return fetchImagePart(parsed.toString());
}

async function fetchImagePart(url: string): Promise<Part> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`image fetch ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_IMAGE_BYTES) throw new Error("image too large");
  const mimeType = res.headers.get("content-type")?.split(";")[0] || mimeFromPath(url);
  return { inlineData: { mimeType, data: buf.toString("base64") } };
}

function mimeFromPath(p: string): string {
  const ext = p.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/* ------------------------------------------------------------------ */

export function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { status?: number; name?: string; message?: string };
    if (e.name === "AbortError") return "timeout";
    const msg = (e.message ?? "").slice(0, 160).replace(/\s+/g, " ");
    return e.status ? `${e.status} ${msg}` : msg;
  }
  return String(err);
}

function uniq(list: (string | undefined)[]): string[] {
  return [...new Set(list.filter((m): m is string => Boolean(m && m.trim())).map((m) => m.trim()))];
}
