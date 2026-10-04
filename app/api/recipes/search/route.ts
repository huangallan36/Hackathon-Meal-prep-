/**
 * GET /api/recipes/search?q=chicken[&have=rice,spinach][&maxTime=30][&diet=vegetarian]
 *   -> PlannerSearchResponse (a RecipeSearchResponse plus section labels / pairings).
 *
 * The bundled catalog always answers first (lib/planner/search.ts, shared with the client's
 * offline fallback). Only when it finds fewer than 3 matches, and Spoonacular is enabled,
 * do we spend quota on complexSearch, with an in-memory cache, hourly/daily budgets and a
 * back-off after 401/402/429, so search-as-you-type can never starve the fridge -> recipes
 * demo path. Any error: HTTP 200 with catalog results (source "cache").
 */
import { getCatalog, youtubeIdFor } from "@/lib/recipes/catalog";
import { normalizeRecipe, type SpoonacularRecipeInfo } from "@/lib/recipes/normalize";
import {
  hasSearchTerms,
  parseSearchParams,
  searchRecipes,
  type PlannerSearchResponse,
  type SearchOptions,
} from "@/lib/planner/search";
import { describeError } from "@/lib/server/gemini";
import { fetchRecipesBulk, rememberRecipe, spoon, SpoonacularError, spoonacularEnabled } from "@/lib/server/spoonacular";
import type { Recipe } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

const MIN_LOCAL_MATCHES = 3;
const LIVE_NUMBER = 8;
/** Live lookups only for real words, not "ch" mid-typing */
const MIN_LIVE_QUERY = 3;
/** Whole live search (complexSearch + optional informationBulk) must fit the client's 10s timeout */
const LIVE_BUDGET_MS = 8_000;
const SEARCH_TIMEOUT_MS = 5_000;
/**
 * Quota guard (free plan = 50 points/day, and the fridge -> recipes demo path needs most of
 * them): per server instance, at most this many live searches per hour / per day, spaced out.
 * One complexSearch with these flags costs roughly 1.7 points.
 */
const LIVE_PER_HOUR = 8;
const LIVE_PER_DAY = 20;
const LIVE_MIN_GAP_MS = 2_000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const CACHE_TTL_MS = HOUR_MS;
/** After a 401/402 (bad key / daily points gone) stop trying for an hour; after a 429, a minute */
const BLOCK_AUTH_MS = HOUR_MS;
const BLOCK_RATE_MS = 60_000;

type SpoonIngredient = NonNullable<SpoonacularRecipeInfo["extendedIngredients"]>[number];

/** complexSearch row with addRecipeInformation + addRecipeInstructions + fillIngredients */
interface ComplexSearchRow extends SpoonacularRecipeInfo {
  missedIngredients?: SpoonIngredient[];
  usedIngredients?: SpoonIngredient[];
}

interface ComplexSearchResponse {
  results?: ComplexSearchRow[];
}

const liveCache = new Map<string, { at: number; recipes: Recipe[] }>();
const LIVE_CACHE_MAX = 100;
const liveCalls: number[] = [];
let liveBlockedUntil = 0;

function respond(body: PlannerSearchResponse) {
  return Response.json(body, {
    headers: { "Cache-Control": body.source === "live" ? "private, max-age=300" : "no-store" },
  });
}

function fromCache(query: string, options: SearchOptions, partial = false) {
  try {
    const local = searchRecipes(query, options);
    return respond(partial ? { ...local, partial } : local);
  } catch (err) {
    // Never expected (pure code over bundled data), but the planner must still get JSON.
    console.warn(`[recipes:search] local search failed: ${describeError(err)}`);
    return respond({
      query,
      matches: [],
      combinations: [],
      similar: [],
      source: "cache",
      labels: { combinations: "", similar: "" },
      anchor: null,
      pairs: {},
      partial: true,
    });
  }
}

function liveKey(query: string, options: SearchOptions): string {
  return [query, options.maxMinutes ?? "", options.diet ?? ""].join("|");
}

function takeLiveSlot(): boolean {
  const now = Date.now();
  if (now < liveBlockedUntil) return false;
  while (liveCalls.length && now - liveCalls[0] > DAY_MS) liveCalls.shift();
  const lastHour = liveCalls.filter((t) => now - t <= HOUR_MS).length;
  const last = liveCalls[liveCalls.length - 1];
  if (liveCalls.length >= LIVE_PER_DAY || lastHour >= LIVE_PER_HOUR || (last != null && now - last < LIVE_MIN_GAP_MS)) {
    return false;
  }
  liveCalls.push(now);
  return true;
}

/** Stop hammering Spoonacular once it says the key is bad, the points are gone or we're too fast */
function backOff(err: unknown) {
  if (!(err instanceof SpoonacularError)) return;
  if (err.status === 401 || err.status === 402) liveBlockedUntil = Date.now() + BLOCK_AUTH_MS;
  else if (err.status === 429) liveBlockedUntil = Date.now() + BLOCK_RATE_MS;
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), Math.max(0, ms));
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** fillIngredients puts every ingredient in missed/used when extendedIngredients is absent */
function withIngredients(row: ComplexSearchRow): SpoonacularRecipeInfo {
  if (row.extendedIngredients?.length) return row;
  const filled = [...(row.missedIngredients ?? []), ...(row.usedIngredients ?? [])];
  return filled.length ? { ...row, extendedIngredients: filled } : row;
}

/** Live recipes for the query, or null when the quota guard skipped the call */
async function liveSearch(query: string, options: SearchOptions): Promise<Recipe[] | null> {
  const key = liveKey(query, options);
  const hit = liveCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.recipes;
  if (!takeLiveSlot()) return null;

  const started = Date.now();
  const res = await spoon<ComplexSearchResponse>(
    "/recipes/complexSearch",
    {
      query,
      number: LIVE_NUMBER,
      instructionsRequired: true,
      addRecipeInformation: true,
      addRecipeInstructions: true,
      fillIngredients: true,
      maxReadyTime: options.maxMinutes,
      diet: options.diet === "vegetarian" || options.diet === "vegan" || options.diet === "gluten free" ? options.diet : undefined,
      intolerances: options.diet === "dairy free" ? "dairy" : undefined,
    },
    SEARCH_TIMEOUT_MS,
  );
  const rows = Array.isArray(res?.results)
    ? res.results.filter((r) => Number.isSafeInteger(r?.id) && typeof r?.title === "string")
    : [];

  const complete: Recipe[] = [];
  const incomplete: number[] = [];
  for (const row of rows) {
    const recipe = normalizeRecipe(withIngredients(row), youtubeIdFor(row.id));
    if (recipe.steps.length && recipe.ingredients.length) complete.push(recipe);
    else incomplete.push(row.id);
  }

  // Rows without ingredients or steps: one informationBulk call, if there is time left.
  let filled: Recipe[] = [];
  const left = LIVE_BUDGET_MS - (Date.now() - started);
  if (incomplete.length && left > 1_500) {
    try {
      filled = (await withDeadline(fetchRecipesBulk(incomplete), left)).filter((r) => r.steps.length > 0);
    } catch (err) {
      console.warn(`[recipes:search] bulk fill skipped: ${describeError(err)}`);
    }
  }

  const order = new Map(rows.map((r, i) => [r.id, i]));
  const recipes = [...complete, ...filled].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  // So /api/recipes/{id} (cooking, groceries) can serve these without another call.
  for (const r of recipes) rememberRecipe(r);
  if (liveCache.size >= LIVE_CACHE_MAX) liveCache.delete(liveCache.keys().next().value ?? "");
  liveCache.set(key, { at: Date.now(), recipes });
  return recipes;
}

export async function GET(req: Request) {
  let query = "";
  let options: SearchOptions = {};
  try {
    ({ query, options } = parseSearchParams(new URL(req.url).searchParams));
    const local = searchRecipes(query, options);
    const wantsLive =
      query.length >= MIN_LIVE_QUERY &&
      local.matches.length < MIN_LOCAL_MATCHES &&
      hasSearchTerms(query) &&
      spoonacularEnabled();
    if (!wantsLive) return respond(local);

    const live = await liveSearch(query, options);
    if (live === null) return respond({ ...local, partial: true });
    if (!live.length) return respond(local);
    const catalogIds = new Set(getCatalog().map((r) => r.id));
    const pinned = live.filter((r) => !catalogIds.has(r.id));
    return respond(searchRecipes(query, options, getCatalog(), pinned));
  } catch (err) {
    backOff(err);
    console.warn(`[recipes:search] serving cache for "${query}": ${describeError(err)}`);
    return fromCache(query, options, true);
  }
}
