/**
 * GET /api/recipes/by-ingredients?ingredients=eggs,spinach,rice
 * Live: Spoonacular findByIngredients (1 point + 0.01/recipe) then one informationBulk
 * call for full recipes with steps. Any failure, or no key: the ranked bundled catalog first
 * (curated for the demo), then live TheMealDB matches (free, no key) appended after it.
 * If TheMealDB fails too: the catalog alone (source "cache"), exactly as before.
 */
import { parseIngredientsParam } from "@/lib/kitchen/sanitize";
import { ingredientMatches, matchRecipe, rankByIngredients } from "@/lib/recipes/catalog";
import { describeError } from "@/lib/server/gemini";
import { fetchRecipesBulk, spoon, spoonacularEnabled } from "@/lib/server/spoonacular";
import { mealMatchesForFridge } from "@/lib/server/themealdb";
import type { ByIngredientsResponse, Recipe, RecipeMatch } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 20;

const LIVE_COUNT = 6;
const CACHE_COUNT = 8;
const MIN_RESULTS = 3;
/** Catalog matches that use the fridge are listed before the live ones (the rest go after) */
const CATALOG_FIRST = 6;
const MEALDB_COUNT = 6;
const MAX_TOTAL = 12;
/** The client gives up after 10s; whatever is left of this budget goes to TheMealDB */
const ROUTE_BUDGET_MS = 8_500;
const MIN_MEALDB_MS = 1_500;

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
 * No Spoonacular (or it failed / found nothing): catalog ranking first, then live TheMealDB
 * matches. Source is "live" only when TheMealDB actually added something.
 */
async function fromCatalogAndMealDb(fridge: string[], started: number) {
  const catalog = rankByIngredients(fridge, CACHE_COUNT);
  const budgetMs = ROUTE_BUDGET_MS - (Date.now() - started);
  if (fridge.length === 0 || budgetMs < MIN_MEALDB_MS) return respond({ matches: catalog, source: "cache" });
  const live = await mealMatchesForFridge(fridge, {
    limit: MEALDB_COUNT,
    budgetMs,
    exclude: catalog.map((m) => m.recipe),
  });
  if (!live.length) return respond({ matches: catalog, source: "cache" });
  const good = catalog.filter((m) => m.used.length > 0);
  const weak = catalog.filter((m) => m.used.length === 0);
  const seen = new Set<number>();
  const matches = [...good.slice(0, CATALOG_FIRST), ...live, ...good.slice(CATALOG_FIRST), ...weak]
    .filter((m) => {
      if (seen.has(m.recipe.id)) return false;
      seen.add(m.recipe.id);
      return true;
    })
    .slice(0, MAX_TOTAL);
  return respond({ matches, source: "live" });
}

/** Never throws: TheMealDB trouble falls back to the catalog alone */
async function fallback(fridge: string[], started: number) {
  try {
    return await fromCatalogAndMealDb(fridge, started);
  } catch (err) {
    console.warn(`[recipes:by-ingredients] TheMealDB skipped: ${describeError(err)}`);
    return fromCache(fridge);
  }
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
  const started = Date.now();
  let fridge: string[] = [];
  try {
    fridge = parseIngredientsParam(new URL(req.url).searchParams.get("ingredients"));
    if (fridge.length === 0) return fromCache(fridge);
    if (!spoonacularEnabled()) return await fallback(fridge, started);

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
    if (live.length === 0) return await fallback(fridge, started);
    return respond({ matches: live, source: "live" });
  } catch (err) {
    console.warn(`[recipes:by-ingredients] Spoonacular unavailable, serving catalog + TheMealDB: ${describeError(err)}`);
    return fallback(fridge, started);
  }
}
