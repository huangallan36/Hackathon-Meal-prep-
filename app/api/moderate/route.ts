/**
 * POST /api/moderate: Gemini checks a Social post (photo + dish name + caption).
 * Always answers 200 with a ModerationResponse. When Gemini is unavailable the
 * shared local caption check decides (source "fallback"), so posting works offline.
 */
import { describeError, hasGeminiKey } from "@/lib/server/gemini";
import { checkTextLocally } from "@/lib/social/moderation-local";
import { API_CAPTION_MAX, API_DISH_NAME_MAX, FRIENDLY } from "@/lib/social/moderation-policy";
import { moderateWithGemini } from "@/lib/social/moderation-server";
import type { ImageInput, ModerationResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 20;

/** ~4 MB of image as base64, plus JSON overhead */
const MAX_BASE64_CHARS = 5_600_000;
const MAX_BODY_CHARS = 6_000_000;
const MAX_URL_CHARS = 2048;
const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|heic|heif|gif)$/i;

type Parsed = { ok: true; image: ImageInput; caption: string; dishName: string } | { ok: false; reason: string };

export async function POST(request: Request): Promise<Response> {
  let caption = "";
  let dishName = "";
  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_CHARS) return reply(block(FRIENDLY.photoTooBig));
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) return reply(block(FRIENDLY.photoTooBig));

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return reply(block(FRIENDLY.badPhoto));
    }
    const parsed = parseBody(body);
    if (!parsed.ok) return reply(block(parsed.reason));
    ({ caption, dishName } = parsed);

    const local = checkTextLocally(dishName, caption);
    if (!hasGeminiKey()) return reply(fromLocal(local));

    const verdict = await moderateWithGemini({ image: parsed.image, caption, dishName, requestUrl: request.url });
    console.info(`[moderate] ${verdict.model} isFood=${verdict.isFood} allowed=${verdict.allowed} local=${local.allowed}`);
    // Belt and braces: the local list can still veto obvious profanity Gemini let through.
    if (verdict.allowed && !local.allowed) return reply({ allowed: false, reason: local.reason, source: "gemini" });
    return reply({ allowed: verdict.allowed, reason: verdict.reason, source: "gemini" });
  } catch (err) {
    console.warn(`[moderate] Gemini unavailable, using local check: ${describeError(err)}`);
    return reply(fromLocal(checkTextLocally(dishName, caption)));
  }
}

function parseBody(body: unknown): Parsed {
  if (!body || typeof body !== "object") return { ok: false, reason: FRIENDLY.noPhoto };
  const b = body as Record<string, unknown>;

  const caption = typeof b.caption === "string" ? b.caption.trim() : "";
  if (caption.length > API_CAPTION_MAX) return { ok: false, reason: FRIENDLY.captionTooLong };
  const dishName = typeof b.dishName === "string" ? b.dishName.trim() : "";
  if (dishName.length > API_DISH_NAME_MAX) return { ok: false, reason: FRIENDLY.dishTooLong };

  const image = parseImage(b.image);
  if (!image.ok) return image;
  return { ok: true, image: image.image, caption, dishName };
}

function parseImage(value: unknown): { ok: true; image: ImageInput } | { ok: false; reason: string } {
  if (!value || typeof value !== "object") return { ok: false, reason: FRIENDLY.noPhoto };
  const v = value as Record<string, unknown>;

  if (typeof v.base64 === "string") {
    const mimeType = typeof v.mimeType === "string" ? v.mimeType : "image/jpeg";
    if (!IMAGE_MIME.test(mimeType) || !v.base64.length) return { ok: false, reason: FRIENDLY.badPhoto };
    if (v.base64.length > MAX_BASE64_CHARS) return { ok: false, reason: FRIENDLY.photoTooBig };
    return { ok: true, image: { base64: v.base64, mimeType } };
  }

  if (typeof v.url === "string" && v.url.length) {
    const url = v.url;
    if (url.startsWith("data:")) {
      if (!/^data:image\/[a-z+.-]+;base64,/i.test(url)) return { ok: false, reason: FRIENDLY.badPhoto };
      if (url.length > MAX_BASE64_CHARS) return { ok: false, reason: FRIENDLY.photoTooBig };
      return { ok: true, image: { url } };
    }
    if (url.length > MAX_URL_CHARS) return { ok: false, reason: FRIENDLY.badPhoto };
    if (!url.startsWith("https://") && !(url.startsWith("/") && !url.startsWith("//"))) {
      return { ok: false, reason: FRIENDLY.badPhoto };
    }
    return { ok: true, image: { url } };
  }
  return { ok: false, reason: FRIENDLY.noPhoto };
}

function block(reason: string): ModerationResponse {
  return { allowed: false, reason, source: "fallback" };
}

function fromLocal(local: { allowed: boolean; reason: string }): ModerationResponse {
  return { allowed: local.allowed, reason: local.allowed ? FRIENDLY.allowed : local.reason, source: "fallback" };
}

function reply(body: ModerationResponse): Response {
  return Response.json(body, { status: 200, headers: { "Cache-Control": "no-store" } });
}
