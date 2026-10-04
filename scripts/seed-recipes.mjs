#!/usr/bin/env node
/**
 * Seeds the offline recipe cache (data/recipes.json) from Spoonacular.
 *
 *   npm run seed               fetch ~21 recipes and rewrite data/recipes.json
 *   npm run seed -- --dry-run  print the plan and the estimated cost, no network
 *
 * The free plan allows 50 points/day, 1 request/s and 2 concurrent requests, so
 * every call here is sequential with a ~1.1s gap and the whole run costs about
 * 23 points (estimated up front, actual cost printed from the quota headers).
 *
 * Flow: 7 popularity-sorted searches (5 results each, instructions + info
 * included) -> local filter + balanced pick (3 per query) -> informationBulk
 * with nutrition for the picks only -> final filter -> trim to the fields
 * lib/recipes/normalize.ts reads -> write data/recipes.json.
 *
 * Safety: the key is read from the environment or .env.local and is only ever
 * sent in the x-api-key header; it is never printed. Nothing is written unless
 * every request succeeded and enough recipes passed the filters, so a failed
 * run (bad key, quota, rate limit, network) leaves the existing cache intact.
 * The previous cache is copied to .tmp/data/recipes.prev.json before writing.
 */
import { copyFile, mkdir, readFile, rename, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "data", "recipes.json");
const YOUTUBE_FILE = path.join(ROOT, "data", "youtube.json");
const BACKUP_FILE = path.join(ROOT, ".tmp", "data", "recipes.prev.json");
const BASE = "https://api.spoonacular.com";
const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");

/** Each query contributes about PER_QUERY recipes so the catalog stays varied */
const QUERIES = [
  { query: "chicken", type: "main course" },
  { query: "beef", type: "main course" },
  { query: "salmon", type: "main course" },
  { query: "eggs" },
  { query: "rice" },
  { query: "pasta" },
  { query: "vegetables" },
];
const RESULTS_PER_QUERY = 5;
const PER_QUERY = 3;
const TARGET = QUERIES.length * PER_QUERY; // 21
const MIN_RECIPES = 8; // refuse to replace the cache with fewer than this
const BULK_CHUNK = 20;
const MIN_STEPS = 3;
const MAX_STEPS = 14;
const MAX_READY_MINUTES = 60;
const GAP_MS = 1100;
const TIMEOUT_MS = 15_000;

const NUTRIENTS = new Set(["Calories", "Protein", "Carbohydrates", "Fat", "Fiber", "Iron", "Calcium", "Vitamin A"]);

/** Not dinner: the planner, cooking mode and Diary expect actual meals */
const NOT_A_MEAL_TYPES = /\b(dessert|beverage|drink|sauce|condiment|dip|spread|marinade)\b/i;
const NOT_A_MEAL_TITLE = /\b(cake|cookies?|muffins?|brownies?|pudding|smoothie|ice cream|cupcakes?|frosting|pie crust|dressing|marinade|cocktail)\b/i;

/* ------------------------------------------------------------------ */
/* Spoonacular point costs (https://spoonacular.com/food-api/docs)     */
/* ------------------------------------------------------------------ */

const COST = {
  search: (n) => 1 + n * 0.01 + n * 0.025 /* addRecipeInformation */ + n * 0.025 /* addRecipeInstructions */,
  bulk: (n) => (n > 0 ? 1 + (n - 1) * 0.5 + n * 0.1 /* includeNutrition */ : 0),
};

/** Split n ids into the fewest chunks of <= BULK_CHUNK, as evenly as possible */
function chunkSizes(n) {
  const count = Math.ceil(n / BULK_CHUNK);
  return Array.from({ length: count }, (_, i) => Math.floor(n / count) + (i < n % count ? 1 : 0));
}

function estimatePoints(bulkCount = TARGET) {
  const search = QUERIES.length * COST.search(RESULTS_PER_QUERY);
  const bulk = chunkSizes(bulkCount).reduce((sum, n) => sum + COST.bulk(n), 0);
  return { search, bulk, total: search + bulk };
}

/* ------------------------------------------------------------------ */
/* Key handling (never printed)                                        */
/* ------------------------------------------------------------------ */

async function readKey() {
  const fromEnv = process.env.SPOONACULAR_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  let text = "";
  try {
    text = await readFile(path.join(ROOT, ".env.local"), "utf8");
  } catch {
    return "";
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?SPOONACULAR_API_KEY\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[1].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    return value.trim();
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */

class SeedError extends Error {}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quota = { used: null, left: null, spent: 0, calls: 0 };
let lastCallAt = 0;
let written = false;

function explainStatus(status) {
  switch (status) {
    case 401:
      return "401 Unauthorized: Spoonacular rejected the key. Check SPOONACULAR_API_KEY in .env.local (copy it again from https://spoonacular.com/food-api/console#Profile).";
    case 402:
      return "402 Payment Required: today's 50 free points are used up. The quota resets at midnight UTC; run npm run seed again after that.";
    case 429:
      return "429 Too Many Requests: Spoonacular is rate limiting this key (free plan: 1 request/s). Wait a minute and run npm run seed again.";
    default:
      return `${status}: unexpected response from Spoonacular.`;
  }
}

async function spoon(key, pathname, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));

  for (let attempt = 1; attempt <= 2; attempt++) {
    const wait = lastCallAt + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    let res;
    try {
      res = await fetch(`${BASE}${pathname}?${qs}`, {
        headers: { "x-api-key": key, accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const reason = err?.name === "TimeoutError" ? `timed out after ${TIMEOUT_MS / 1000}s` : err?.message ?? String(err);
      throw new SeedError(`Network error calling ${pathname}: ${reason}`);
    }

    quota.calls++;
    const request = Number(res.headers.get("x-api-quota-request"));
    if (Number.isFinite(request)) quota.spent += request;
    quota.used = res.headers.get("x-api-quota-used") ?? quota.used;
    quota.left = res.headers.get("x-api-quota-left") ?? quota.left;
    console.log(
      `    ${res.status} ${pathname}  quota: request ${res.headers.get("x-api-quota-request") ?? "?"}, used ${quota.used ?? "?"}, left ${quota.left ?? "?"}`,
    );

    if (res.status === 429 && attempt === 1) {
      console.log("    rate limited, waiting 3s and retrying once...");
      await sleep(3000);
      continue;
    }
    if (!res.ok) throw new SeedError(explainStatus(res.status));
    try {
      return await res.json();
    } catch {
      throw new SeedError(`Spoonacular returned invalid JSON for ${pathname}.`);
    }
  }
  throw new SeedError(explainStatus(429));
}

/* ------------------------------------------------------------------ */
/* Filtering + trimming                                                */
/* ------------------------------------------------------------------ */

function stepCount(recipe) {
  return (recipe.analyzedInstructions ?? []).reduce((sum, s) => sum + (s.steps?.filter((x) => x.step?.trim()).length ?? 0), 0);
}

function cleanTitle(title) {
  if (typeof title !== "string") return false;
  const t = title.trim();
  return (
    t.length >= 4 &&
    t.length <= 70 &&
    !/&#|<|>|\?|\*|@|#|\|/.test(t) &&
    /^[\p{L}\p{N} ,.'&()\-–:!/]+$/u.test(t) &&
    t !== t.toUpperCase()
  );
}

/** Why a recipe is rejected, or null if it is a keeper. `strict` requires steps + nutrition. */
function rejection(recipe, strict) {
  if (!recipe?.id || !recipe.image) return "no image";
  if (!cleanTitle(recipe.title)) return "odd title";
  if (!(recipe.readyInMinutes > 0 && recipe.readyInMinutes <= MAX_READY_MINUTES)) return `ready in ${recipe.readyInMinutes} min`;
  if ((recipe.dishTypes ?? []).some((d) => NOT_A_MEAL_TYPES.test(d)) || NOT_A_MEAL_TITLE.test(recipe.title)) return "not a meal";
  const steps = stepCount(recipe);
  if ((strict || recipe.analyzedInstructions) && (steps < MIN_STEPS || steps > MAX_STEPS)) return `${steps} steps`;
  if (strict && !recipe.nutrition?.nutrients?.some((n) => n.name === "Calories")) return "no nutrition";
  return null;
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] !== undefined && obj[k] !== null).map((k) => [k, obj[k]]));

/** Only what lib/recipes/normalize.ts reads, so the cache stays small */
function trim(recipe) {
  return {
    ...pick(recipe, ["id", "title", "image", "imageType", "servings", "readyInMinutes", "sourceName", "creditsText", "sourceUrl", "summary", "instructions"]),
    analyzedInstructions: (recipe.analyzedInstructions ?? []).map((section) => ({
      name: section.name ?? "",
      steps: (section.steps ?? []).map((s) => pick(s, ["number", "step", "length"])),
    })),
    extendedIngredients: (recipe.extendedIngredients ?? []).map((i) =>
      pick(i, ["id", "name", "nameClean", "original", "amount", "unit", "image", "aisle"]),
    ),
    cuisines: recipe.cuisines ?? [],
    dishTypes: recipe.dishTypes ?? [],
    diets: recipe.diets ?? [],
    nutrition: {
      nutrients: (recipe.nutrition?.nutrients ?? [])
        .filter((n) => NUTRIENTS.has(n.name))
        .map((n) => ({ name: n.name, amount: n.amount, unit: n.unit })),
    },
  };
}

/**
 * Round-robin across queries so no single query dominates the catalog: the
 * first perQuery rounds give every query one pick each, later rounds let
 * queries with spare results top up any shortfall.
 */
function balancedPick(buckets, perQuery, target) {
  const chosen = [];
  const taken = new Set();
  for (let round = 0; chosen.length < target; round++) {
    let progressed = false;
    for (let q = 0; q < buckets.length && chosen.length < target; q++) {
      const next = buckets[q].find((r) => !taken.has(r.id));
      if (!next) continue;
      taken.add(next.id);
      chosen.push({ ...next, _query: QUERIES[q].query });
      progressed = true;
    }
    if (!progressed && round >= perQuery) break;
  }
  return chosen;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function printPlan(hasKey) {
  const est = estimatePoints();
  console.log("Sous recipe seed: plan");
  console.log(`  Spoonacular key: ${hasKey ? "found (hidden)" : "not found"}`);
  console.log(`  1) ${QUERIES.length} x GET /recipes/complexSearch (sequential, ${GAP_MS}ms apart)`);
  for (const q of QUERIES) {
    console.log(
      `       query="${q.query}"${q.type ? ` type="${q.type}"` : ""} number=${RESULTS_PER_QUERY} sort=popularity maxReadyTime=${MAX_READY_MINUTES} instructionsRequired addRecipeInformation addRecipeInstructions`,
    );
  }
  console.log(`  2) filter: image, clean title, <= ${MAX_READY_MINUTES} min, ${MIN_STEPS}-${MAX_STEPS} steps, real meals; pick ${PER_QUERY} per query (target ${TARGET})`);
  console.log(`  3) GET /recipes/informationBulk?includeNutrition=true in chunks of ${chunkSizes(TARGET).join(" + ")} ids`);
  console.log(`  4) trim + write ${rel(OUT_FILE)} (previous copy kept in ${rel(BACKUP_FILE)})`);
  console.log(
    `  Estimated cost: ${est.search.toFixed(1)} (search) + ${est.bulk.toFixed(1)} (bulk) = ~${Math.ceil(est.total)} points of the free plan's 50/day`,
  );
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    console.log("Usage: npm run seed [-- --dry-run]\n  Rewrites data/recipes.json from Spoonacular (~23 points). --dry-run prints the plan only.");
    return;
  }

  const key = await readKey();
  if (args.has("--dry-run")) {
    printPlan(Boolean(key));
    console.log("\nDry run: no requests were made and nothing was written.");
    return;
  }
  if (!key) {
    console.error("No Spoonacular key found.");
    console.error("Add SPOONACULAR_API_KEY to .env.local, then run npm run seed");
    console.error("(free key: https://spoonacular.com/food-api/console). data/recipes.json was not changed.");
    process.exit(1);
  }

  printPlan(true);
  console.log("");

  // 1) Searches
  const buckets = [];
  const seen = new Set();
  for (const q of QUERIES) {
    console.log(`  search "${q.query}"`);
    const data = await spoon(key, "/recipes/complexSearch", {
      query: q.query,
      type: q.type,
      number: RESULTS_PER_QUERY,
      sort: "popularity",
      instructionsRequired: true,
      addRecipeInformation: true,
      addRecipeInstructions: true,
      maxReadyTime: MAX_READY_MINUTES,
    });
    const results = Array.isArray(data?.results) ? data.results : [];
    const keep = [];
    for (const r of results) {
      if (!r?.id || seen.has(r.id)) continue;
      seen.add(r.id);
      const why = rejection(r, false);
      if (why) console.log(`      skip  ${r.title ?? r.id} (${why})`);
      else keep.push(r);
    }
    buckets.push(keep);
  }

  // 2) Balanced pick
  const picks = balancedPick(buckets, PER_QUERY, TARGET);
  if (picks.length < MIN_RECIPES) {
    throw new SeedError(`Only ${picks.length} usable recipes in the search results (need ${MIN_RECIPES}). Nothing was written.`);
  }

  // 3) Full information + nutrition for the picks only
  const queryOf = new Map(picks.map((p) => [p.id, p._query]));
  const full = [];
  let offset = 0;
  for (const size of chunkSizes(picks.length)) {
    const ids = picks.slice(offset, offset + size).map((p) => p.id);
    offset += size;
    console.log(`  informationBulk (${ids.length} ids)`);
    const data = await spoon(key, "/recipes/informationBulk", { ids: ids.join(","), includeNutrition: true });
    if (Array.isArray(data)) full.push(...data);
  }

  // 4) Final filter + trim
  const recipes = [];
  for (const r of full) {
    const why = rejection(r, true);
    if (why) {
      console.log(`      drop  ${r.title} (${why})`);
      continue;
    }
    recipes.push(trim(r));
  }
  if (recipes.length < MIN_RECIPES) {
    throw new SeedError(`Only ${recipes.length} recipes passed the final checks (need ${MIN_RECIPES}). Nothing was written.`);
  }

  // 5) Write atomically, keeping a backup of the previous cache
  await mkdir(path.dirname(BACKUP_FILE), { recursive: true });
  await copyFile(OUT_FILE, BACKUP_FILE).catch(() => {});
  const tmp = `${OUT_FILE}.tmp`;
  await writeFile(tmp, `${JSON.stringify(recipes, null, 2)}\n`, "utf8");
  await rename(tmp, OUT_FILE);
  written = true;
  await access(YOUTUBE_FILE).catch(() => writeFile(YOUTUBE_FILE, "{}\n", "utf8"));

  let youtube = {};
  try {
    youtube = JSON.parse(await readFile(YOUTUBE_FILE, "utf8"));
  } catch {
    /* optional */
  }

  console.log(`\nWrote ${recipes.length} recipes to ${rel(OUT_FILE)}:`);
  for (const r of recipes) {
    const steps = stepCount(r);
    const kcal = Math.round(r.nutrition.nutrients.find((n) => n.name === "Calories")?.amount ?? 0);
    const yt = youtube[String(r.id)] ? "  [video]" : "";
    console.log(`  ${String(r.id).padEnd(8)} ${r.title}  (${queryOf.get(r.id) ?? "?"}, ${r.readyInMinutes} min, ${steps} steps, ${kcal} kcal)${yt}`);
  }
  const est = estimatePoints(picks.length);
  console.log(
    `\nPoints: ~${est.total.toFixed(1)} estimated, ${quota.spent ? quota.spent.toFixed(2) : "?"} charged over ${quota.calls} calls. ` +
      `X-API-Quota-Used ${quota.used ?? "?"}, X-API-Quota-Left ${quota.left ?? "?"}.`,
  );
  console.log("Tip: map recipe ids to YouTube tutorial ids in data/youtube.json to show a video in cooking mode.");
}

main().catch((err) => {
  const message = err instanceof SeedError ? err.message : `unexpected error: ${err instanceof Error ? err.message : err}`;
  console.error(`\nSeed failed: ${message}`);
  console.error(written ? "data/recipes.json was already written; check it before committing." : "data/recipes.json was not changed.");
  process.exit(1);
});
