/**
 * POST /api/nutrition/estimate: foods described in words ("chicken wrap and a latte")
 * -> one item per food or drink with calories, macros and micronutrients.
 * Gemini Flash-Lite with structured output; on any failure (no key, quota, timeout,
 * bad JSON) it answers 200 from the local food table with source "fallback". When Gemini
 * finds no food at all (and the table knows none either) the items list is empty.
 */
import { FOOD_SCHEMA, FOOD_SYSTEM_PROMPT, FOOD_TEXT_MAX, cleanLine, foodUserPrompt, sanitizeFoods } from "@/lib/diary/food-estimate";
import { localFoodEstimate, mentionsFood } from "@/lib/diary/food-table";
import { CHAT_MODELS, describeError, generateJSON, hasGeminiKey } from "@/lib/server/gemini";
import type { FoodEstimateResponse, MealType, SpokenFood } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 20;

const MAX_BODY_CHARS = 4_000;
/** The client waits TIMEOUTS.nutrition (12s); answer well before that */
const BUDGET_MS = 9_500;
const ATTEMPT_MS = 6_000;
const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];

function reply(items: SpokenFood[], source: FoodEstimateResponse["source"]): Response {
  const body: FoodEstimateResponse = { items, source };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  let text = "";
  try {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_CHARS) return reply([], "fallback");
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return reply([], "fallback");

    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
    } catch {
      return reply([], "fallback");
    }

    const rawText = typeof body.text === "string" ? body.text : "";
    text = cleanLine(rawText, FOOD_TEXT_MAX + 1);
    if (!text || text.length > FOOD_TEXT_MAX) {
      // 1-300 characters of description; anything else gets an empty (still 200) answer
      return reply([], "fallback");
    }
    const meal = MEALS.includes(body.meal as MealType) ? (body.meal as MealType) : undefined;

    if (!hasGeminiKey()) {
      console.warn("[nutrition/estimate] GEMINI_API_KEY missing, using the food table");
      return reply(localFoodEstimate(text), "fallback");
    }

    const { data, model } = await generateJSON<unknown>({
      models: CHAT_MODELS,
      parts: [{ text: foodUserPrompt(text, meal) }],
      schema: FOOD_SCHEMA,
      systemInstruction: FOOD_SYSTEM_PROMPT,
      timeoutMs: BUDGET_MS,
      attemptTimeoutMs: ATTEMPT_MS,
      label: "food",
    });
    const items = sanitizeFoods(data);
    if (!items.length) {
      // Gemini found no food. Trust it unless the table knows a food in there (then it slipped).
      if (!mentionsFood(text)) {
        console.info(`[nutrition/estimate] ${model}: no food in the description`);
        return reply([], "gemini");
      }
      console.warn(`[nutrition/estimate] ${model} returned no usable items, using the food table`);
      return reply(localFoodEstimate(text), "fallback");
    }
    console.info(`[nutrition/estimate] ${model}: ${items.length} item(s), ${items.reduce((a, i) => a + i.calories, 0)} kcal`);
    return reply(items, "gemini");
  } catch (err) {
    console.warn(`[nutrition/estimate] falling back: ${describeError(err)}`);
    try {
      return reply(text ? localFoodEstimate(text) : [], "fallback");
    } catch {
      return reply([], "fallback");
    }
  }
}
