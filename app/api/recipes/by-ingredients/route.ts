/**
 * GET /api/recipes/by-ingredients?ingredients=eggs,spinach,rice
 * Live: Spoonacular findByIngredients (1 point + 0.01/recipe) then one informationBulk
 * call for full recipes with steps. Any failure, or no key: ranked bundled cache.
 */
import { parseIngredientsParam } from "@/lib/kitchen/sanitize";
import { ingredientMatches, matchRecipe, rankByIngredients } from "@/lib/recipes/catalog";
import { describeError } from "@/lib/server/gemini";
import { fetchRecipesBulk, spoon, spoonacularEnabled } from "@/lib/server/spoonacular";
import type { ByIngredientsResponse, Recipe, RecipeMatch } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 20;

const LIVE_COUNT = 6;
const CACHE_COUNT = 8;
const MIN_RESULTS = 3;

/** Subset of a findByIngredients result row */
interface FoundRecipe {
  id: number;
  title: string;
  usedIngredients?: { id?: number; name?: string }[];
  missedIngredients?: { id?: number; name?: string }[];
}

function respond(body: ByIngredientsResponse) {
  return Response.json(body, {
    headers: { "Cache-Control": body.source === "live" ? "private, max-age=300" : "no-store" },
  });
}

function fromCache(fridge: string[]) {
  return respond({ matches: rankByIngredients(fridge, CACHE_COUNT), source: "cache" });
}

/**
 * Our matcher is the source of truth for chips (consistent with cached recipes), but
 * Spoonacular's own "used" list catches synonyms we miss, so it can promote a
 * missing ingredient to used.
 */
function toMatch(recipe: Recipe, fridge: string[], hit?: FoundRecipe): RecipeMatch {
  const base = matchRecipe(recipe, fridge);
  if (!hit?.usedIngredients?.length) return base;
  const usedIds = new Set(hit.usedIngredients.map((u) => u.id).filter((id): id is number => typeof id === "number"));
  const used = new Set(base.used);
  for (const u of hit.usedIngredients) {
    const f = u.name ? fridge.find((item) => ingredientMatches(item, u.name!)) : undefined;
    if (f) used.add(f);
  }
  const missing = base.missing.filter((m) => m.id == null || !usedIds.has(m.id));
  return { recipe, used: [...used], missing };
}

export async function GET(req: Request) {
  let fridge: string[] = [];
  try {
    fridge = parseIngredientsParam(new URL(req.url).searchParams.get("ingredients"));
    if (fridge.length === 0 || !spoonacularEnabled()) return fromCache(fridge);

    const found = await spoon<FoundRecipe[]>("/recipes/findByIngredients", {
      ingredients: fridge.join(","),
      number: LIVE_COUNT,
      ranking: 2,
      ignorePantry: true,
    });
    const rows = Array.isArray(found) ? found.filter((f) => Number.isInteger(f?.id)) : [];
    const recipes = rows.length ? await fetchRecipesBulk(rows.map((r) => r.id)) : [];

    const live = recipes
      .filter((r) => r.steps.length > 0)
      .map((r) => toMatch(r, fridge, rows.find((row) => row.id === r.id)))
      .sort((a, b) => b.used.length - a.used.length || a.missing.length - b.missing.length);

    if (live.length < MIN_RESULTS) {
      const have = new Set(live.map((m) => m.recipe.id));
      const extra = rankByIngredients(fridge, CACHE_COUNT).filter((m) => !have.has(m.recipe.id));
      live.push(...extra.slice(0, LIVE_COUNT - live.length));
    }
    if (live.length === 0) return fromCache(fridge);
    return respond({ matches: live, source: "live" });
  } catch (err) {
    console.warn(`[recipes:by-ingredients] serving cache: ${describeError(err)}`);
    return fromCache(fridge);
  }
}
