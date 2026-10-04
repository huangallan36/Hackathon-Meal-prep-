/**
 * POST /api/vision/meal: photo of a finished meal -> estimated dish + calories and macros.
 * Gemini vision with structured output; on any failure it answers 200 with the recipe's
 * per-serving nutrition (or a generic plate) and source "fallback".
 */
import { fallbackEstimate, cleanText, MEAL_SCHEMA, MEAL_SYSTEM_PROMPT, mealUserPrompt, sanitizeEstimate } from "@/lib/cooking/meal";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { describeError, generateJSON, hasGeminiKey, imagePart, VISION_MODELS } from "@/lib/server/gemini";
import { recalledRecipe } from "@/lib/server/spoonacular";
import type { ImageInput, MealEstimate, MealEstimateResponse, Recipe } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/** ~4 MB of base64 image plus JSON overhead */
const MAX_BODY_CHARS = 6_000_000;
const MAX_URL_CHARS = 2048;
const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
const BASE64 = /^(?:data:image\/[\w.+-]+;base64,)?[A-Za-z0-9+/\r\n]+={0,2}$/;

/**
 * Whole-request budget. The client gives up after TIMEOUTS.vision (25s), so the answer
 * (Gemini or fallback) must be back before that, including the time to fetch a URL image.
 */
const BUDGET_MS = 22_500;
const ATTEMPT_MS = 12_000;
/** Not worth starting a vision call with less than this left */
const MIN_GEMINI_MS = 3_000;

function reply(estimate: MealEstimate, source: MealEstimateResponse["source"]): Response {
  const body: MealEstimateResponse = { estimate, source };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

function parseImage(value: unknown): ImageInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.base64 === "string") {
    const mimeType = typeof v.mimeType === "string" ? v.mimeType : "image/jpeg";
    if (!IMAGE_MIME.test(mimeType) || v.base64.length < 100 || !BASE64.test(v.base64)) return null;
    return { base64: v.base64, mimeType };
  }
  if (typeof v.url === "string" && v.url.length <= MAX_URL_CHARS) {
    // Gemini cannot read SVG (the placeholder dish art): go straight to the fallback.
    if (/\.svg(\?|#|$)/i.test(v.url) || v.url.startsWith("data:image/svg")) return null;
    return { url: v.url };
  }
  return null;
}

function parseRecipeId(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n < 1e10 ? n : undefined;
}

export async function POST(req: Request): Promise<Response> {
  const deadline = Date.now() + BUDGET_MS;
  let recipe: Recipe | undefined;
  let dishHint: string | undefined;

  try {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_CHARS) {
      console.warn(`[vision/meal] body too large (${declared} bytes)`);
      return reply(fallbackEstimate(null), "fallback");
    }
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return reply(fallbackEstimate(null), "fallback");

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      return reply(fallbackEstimate(null), "fallback");
    }

    const recipeId = parseRecipeId(body.recipeId);
    recipe = recipeId ? (getCachedRecipe(recipeId) ?? recalledRecipe(recipeId)) : undefined;
    dishHint = cleanText(body.dishHint, 120) ?? undefined;
    const fallback = fallbackEstimate(recipe, dishHint);

    const image = parseImage(body.image);
    if (!image) return reply(fallback, "fallback");
    if (!hasGeminiKey()) {
      console.warn("[vision/meal] GEMINI_API_KEY missing, using fallback");
      return reply(fallback, "fallback");
    }

    const photo = await imagePart(image, req.url);
    const remaining = deadline - Date.now();
    if (remaining < MIN_GEMINI_MS) {
      console.warn(`[vision/meal] image took too long (${BUDGET_MS - remaining}ms), using fallback`);
      return reply(fallback, "fallback");
    }
    const { data, model } = await generateJSON<unknown>({
      models: VISION_MODELS,
      parts: [
        photo,
        { text: mealUserPrompt({ title: recipe?.title ?? dishHint, nutrition: recipe?.nutrition, servings: recipe?.servings }) },
      ],
      schema: MEAL_SCHEMA,
      systemInstruction: MEAL_SYSTEM_PROMPT,
      timeoutMs: remaining,
      attemptTimeoutMs: Math.min(ATTEMPT_MS, remaining),
      label: "meal",
    });
    const estimate = sanitizeEstimate(data, fallback);
    console.info(`[vision/meal] ${model}: ${estimate.dishName}, ${estimate.calories} kcal (${estimate.confidence})`);
    return reply(estimate, "gemini");
  } catch (err) {
    console.warn(`[vision/meal] falling back: ${describeError(err)}`);
    try {
      return reply(fallbackEstimate(recipe, dishHint), "fallback");
    } catch {
      return reply(fallbackEstimate(null), "fallback");
    }
  }
}
