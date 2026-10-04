/**
 * Server-only Spoonacular client. The key goes in the x-api-key header so it never
 * appears in URLs or logs. Free plan: 50 points/day, 1 req/s, 2 concurrent.
 *   401 = bad/missing key, 402 = daily points used up, 429 = too fast.
 * Callers must catch and fall back to the cache (lib/recipes/catalog.ts).
 */
import type { Recipe } from "@/lib/types";
import { normalizeRecipe, type SpoonacularRecipeInfo } from "@/lib/recipes/normalize";
import { youtubeIdFor } from "@/lib/recipes/catalog";

const BASE = "https://api.spoonacular.com";

export class SpoonacularError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** False when there is no key or SOUS_FORCE_CACHE=1 (demo-day quota saver) */
export function spoonacularEnabled(): boolean {
  return Boolean(process.env.SPOONACULAR_API_KEY?.trim()) && process.env.SOUS_FORCE_CACHE !== "1";
}

type Params = Record<string, string | number | boolean | undefined>;

export async function spoon<T>(path: string, params: Params = {}, timeoutMs = 8000): Promise<T> {
  const key = process.env.SPOONACULAR_API_KEY?.trim();
  if (!key) throw new SpoonacularError(0, "SPOONACULAR_API_KEY not set");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const started = Date.now();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const left = res.headers.get("x-api-quota-left");
  console.info(`[spoonacular] ${path} ${res.status} in ${Date.now() - started}ms, quota left ${left ?? "?"}`);
  if (!res.ok) throw new SpoonacularError(res.status, res.statusText || "request failed");
  return (await res.json()) as T;
}

/* In-memory cache of normalized live recipes (per server instance, 1 hour). TheMealDB recipes
   (lib/server/themealdb.ts) are remembered here too, so every route can recall them by id. */
const recipeCache = new Map<number, { at: number; recipe: Recipe }>();
const HOUR = 60 * 60 * 1000;

export function rememberRecipe(recipe: Recipe) {
  recipeCache.set(recipe.id, { at: Date.now(), recipe });
}

export function recalledRecipe(id: number): Recipe | undefined {
  const hit = recipeCache.get(id);
  if (hit && Date.now() - hit.at < HOUR) return hit.recipe;
  return undefined;
}

/** Full recipes (with steps + nutrition) for a list of ids, in one informationBulk call. */
export async function fetchRecipesBulk(ids: number[]): Promise<Recipe[]> {
  const need = ids.filter((id) => !recalledRecipe(id));
  if (need.length) {
    const infos = await spoon<SpoonacularRecipeInfo[]>("/recipes/informationBulk", {
      ids: need.join(","),
      includeNutrition: true,
    });
    for (const info of infos) rememberRecipe(normalizeRecipe(info, youtubeIdFor(info.id)));
  }
  return ids.map((id) => recalledRecipe(id)).filter((r): r is Recipe => Boolean(r));
}
