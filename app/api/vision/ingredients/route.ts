/**
 * POST /api/vision/ingredients: fridge photo -> ingredient names (Gemini vision).
 * Any failure (no key, model chain down, bad image, empty answer) returns the sample
 * fridge list with source "fallback", so the demo path never dead-ends.
 */
import { hedgedJSON } from "@/lib/kitchen/hedge";
import { cleanIngredientList, isImageInput, type DetectedIngredient } from "@/lib/kitchen/sanitize";
import { SAMPLE_FRIDGE_INGREDIENTS, SAMPLE_FRIDGE_PHOTO } from "@/lib/sample";
import { describeError, hasGeminiKey, imagePart, VISION_MODELS } from "@/lib/server/gemini";
import type { IngredientsResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * The shared vision chain plus one more model as a last resort: on the day we tested,
 * 3.7/3.8 Flash answered 429 (quota) while 3.6 Flash and Flash-Lite still worked.
 */
const MODELS = [...new Set([...VISION_MODELS, "gemini-3.6-flash"])];

/** ~5 MB of JSON; client photos are downscaled to ~150-400 KB before upload */
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const SYSTEM = "You are the vision system of a cooking app. You inventory food in photos accurately and never invent items.";

const PROMPT = `List the distinct, cookable food ingredients that are clearly visible in this photo of a fridge, counter or pantry.

Rules:
- Use short, lowercase, common names the way a shopper would say them, singular unless the item is naturally plural: "eggs", "chicken breast", "bell pepper", "spinach", "cheddar cheese", "green onions".
- No brand names. No containers or packaging ("milk", not "milk carton"; "yogurt", not "yogurt tub").
- Skip condiments, sauces and drinks unless they are obvious and prominent.
- Merge duplicates and drop quantities ("3 tomatoes" -> "tomatoes").
- Only list what you can actually see. Never guess at hidden or unlabeled items.
- Most prominent items first, at most 20.
- confidence: "high" = clearly visible and identifiable, "medium" = probably right, "low" = unsure.
If there is no food in the photo, return an empty list.`;

const SCHEMA = {
  type: "object",
  properties: {
    ingredients: {
      type: "array",
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short lowercase ingredient name, e.g. 'bell pepper'" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["name", "confidence"],
      },
    },
  },
  required: ["ingredients"],
} as const;

function respond(body: IngredientsResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const fallback = (status = 200) => respond({ ingredients: [...SAMPLE_FRIDGE_INGREDIENTS], source: "fallback" }, status);

export async function POST(req: Request) {
  try {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return fallback(413);

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return fallback(413);

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return fallback(400);
    }
    const image = (body as { image?: unknown } | null)?.image;
    if (!isImageInput(image)) return fallback(400);

    if (!hasGeminiKey()) {
      console.warn("[vision:ingredients] GEMINI_API_KEY missing, serving sample ingredients");
      return fallback();
    }

    // The canned list matches the sample photo, so the demo photo gets a tighter budget:
    // falling back early looks identical to a slow success.
    const isSample = "url" in image && image.url === SAMPLE_FRIDGE_PHOTO;
    const part = await imagePart(image, req.url);
    // Hedged rather than strictly sequential: an overloaded model can hang for 40 s.
    const { data, model } = await hedgedJSON<{ ingredients?: DetectedIngredient[] }>({
      models: MODELS,
      parts: [part, { text: PROMPT }],
      schema: SCHEMA,
      systemInstruction: SYSTEM,
      timeoutMs: isSample ? 9_000 : 20_000,
      staggerMs: isSample ? 3_000 : 3_500,
      label: "ingredients",
      accept: (d) => cleanIngredientList(d?.ingredients).length > 0,
    });

    const ingredients = cleanIngredientList(data?.ingredients);
    if (ingredients.length === 0) {
      console.warn(`[vision:ingredients] ${model} found no ingredients, serving sample list`);
      return fallback();
    }
    return respond({ ingredients, source: "gemini" });
  } catch (err) {
    console.warn(`[vision:ingredients] falling back: ${describeError(err)}`);
    return fallback();
  }
}
