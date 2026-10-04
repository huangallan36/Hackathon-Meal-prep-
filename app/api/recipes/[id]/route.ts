/**
 * GET /api/recipes/{id} -> RecipeResponse.
 * Order: in-memory live cache -> bundled catalog -> TheMealDB (ids in its range) ->
 * Spoonacular (when enabled).
 * Unknown ids return 404 JSON { error }; loadRecipe() on the client handles it.
 */
import { getCachedRecipe, youtubeIdFor } from "@/lib/recipes/catalog";
import { normalizeRecipe, type SpoonacularRecipeInfo } from "@/lib/recipes/normalize";
import { describeError } from "@/lib/server/gemini";
import { recalledRecipe, rememberRecipe, spoon, spoonacularEnabled, SpoonacularError } from "@/lib/server/spoonacular";
import { isMealDbId, mealRecipe } from "@/lib/server/themealdb";
import type { RecipeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

function ok(body: RecipeResponse) {
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=3600" } });
}

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let id = 0;
  try {
    const raw = (await params).id;
    if (!/^\d{1,10}$/.test(raw)) return error("Recipe id must be a number", 400);
    id = Number(raw);
    if (!Number.isSafeInteger(id) || id <= 0) return error("Recipe id must be a number", 400);

    // TheMealDB ids: recalled or looked up, with nutrition estimated from the ingredients
    if (isMealDbId(id)) {
      const meal = await mealRecipe(id);
      return meal ? ok({ recipe: meal, source: "live" }) : error("Recipe is unavailable right now", 503);
    }

    const recalled = recalledRecipe(id);
    if (recalled) return ok({ recipe: recalled, source: "live" });

    const cached = getCachedRecipe(id);
    if (cached) return ok({ recipe: cached, source: "cache" });

    if (!spoonacularEnabled()) return error("Recipe not found", 404);

    const info = await spoon<SpoonacularRecipeInfo>(`/recipes/${id}/information`, { includeNutrition: true });
    const recipe = normalizeRecipe(info, youtubeIdFor(id));
    if (recipe.steps.length === 0) return error("That recipe has no instructions", 404);
    rememberRecipe(recipe);
    return ok({ recipe, source: "live" });
  } catch (err) {
    if (err instanceof SpoonacularError && err.status === 404) return error("Recipe not found", 404);
    console.warn(`[recipes:${id || "?"}] lookup failed: ${describeError(err)}`);
    return error("Recipe is unavailable right now", 503);
  }
}
