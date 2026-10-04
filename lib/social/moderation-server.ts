/**
 * Server-only: Gemini image + text moderation for Social posts.
 * Throws when the model chain fails; the route turns that into the local fallback.
 */
import type { Part } from "@google/genai";
import { CHAT_MODELS, VISION_MODELS, generateJSON, imagePart } from "@/lib/server/gemini";
import type { ImageInput } from "@/lib/types";
import {
  MODERATION_SCHEMA,
  MODERATION_SYSTEM_PROMPT,
  moderationUserText,
  normalizeVerdict,
  type ModerationVerdict,
} from "./moderation-policy";

/**
 * Flash-Lite first (fast, handles image + text), then the bigger Flash models as a
 * last resort: Lite hits 429 rate limits and Flash returns 503 under load.
 */
const MODERATION_MODELS = [...new Set([...CHAT_MODELS, ...VISION_MODELS])];

/**
 * Photos bundled with the app (/public paths, e.g. sample or placeholder dishes) are
 * trusted food images, and Gemini can't read SVG, so only the text is checked.
 */
export function isBundledAsset(image: ImageInput): boolean {
  return "url" in image && image.url.startsWith("/") && !image.url.startsWith("//");
}

export async function moderateWithGemini(opts: {
  image: ImageInput;
  caption: string;
  dishName: string;
  /** Used to resolve /public paths when running on Vercel */
  requestUrl: string;
  /** Total budget for image fetch + Gemini (default 12s) */
  timeoutMs?: number;
}): Promise<ModerationVerdict & { model: string }> {
  const started = Date.now();
  const hasPhoto = !isBundledAsset(opts.image);
  const parts: Part[] = [];
  if (hasPhoto) parts.push(await imagePart(opts.image, opts.requestUrl));
  parts.push({ text: moderationUserText(opts.caption, opts.dishName, hasPhoto) });

  // One budget for the image fetch + model chain, so the route answers before the
  // client gives up (TIMEOUTS.moderation = 15s).
  const budget = Math.max(3_000, (opts.timeoutMs ?? 12_000) - (Date.now() - started));
  const { data, model } = await generateJSON<unknown>({
    models: MODERATION_MODELS,
    parts,
    schema: MODERATION_SCHEMA,
    systemInstruction: MODERATION_SYSTEM_PROMPT,
    timeoutMs: budget,
    attemptTimeoutMs: Math.min(6_500, budget),
    label: "moderate",
  });
  return { ...normalizeVerdict(data, hasPhoto), model };
}
