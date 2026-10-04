/**
 * Meal planner search ("Read mode"). Pure and isomorphic: GET /api/recipes/search runs it
 * on the server and the planner screen runs the exact same code on the bundled catalog when
 * the network is down, so both paths always produce the same three sections:
 *
 *   matches       title / ingredient / cuisine / dish type / diet hits (title weighted highest)
 *   combinations  recipes that pair the query ingredient with something else, preferring what
 *                 the user already has (`have`), else a main ingredient (rice, pasta, greens...)
 *   similar       same cuisine or dish type as the top matches, not already listed
 */
import { getCatalog, ingredientMatches, isPantry } from "@/lib/recipes/catalog";
import { parseIngredientsParam } from "@/lib/kitchen/sanitize";
import type { Recipe, RecipeSearchResponse } from "@/lib/types";

export const MAX_QUERY_LENGTH = 60;
const MAX_MATCHES = 24;
const MAX_COMBINATIONS = 12;
const MAX_SIMILAR = 12;

export const DIETS = ["vegetarian", "vegan", "gluten free", "dairy free"] as const;
export type DietFilter = (typeof DIETS)[number];

export interface SearchFilters {
  /** Only recipes ready in this many minutes or less */
  maxMinutes?: number;
  diet?: DietFilter;
}

export interface SearchOptions extends SearchFilters {
  /** Ingredients the user has (fridge chips); steers Combinations */
  have?: string[];
}

/** RecipeSearchResponse plus presentation hints computed alongside the results */
export interface PlannerSearchResponse extends RecipeSearchResponse {
  labels: { combinations: string; similar: string };
  /** The query ingredient Combinations are built around, as typed ("eggs") */
  anchor: string | null;
  /** recipeId -> what that combination pairs the anchor with, e.g. ["rice", "spinach"] */
  pairs: Record<string, string[]>;
  /**
   * True when a live lookup was wanted but skipped (quota guard, upstream error), so the client
   * should not keep this answer for the session: asking again later may find more.
   */
  partial?: boolean;
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "a", "an", "and", "the", "with", "for", "of", "in", "on", "to", "or", "my", "me", "i", "some", "something",
  "recipe", "recipes", "dish", "dishes", "meal", "meals", "food", "idea", "ideas", "make", "cook", "cooking",
  "want", "how", "what", "good", "best", "made", "using", "from",
]);

/** Words that mean "fast" rather than naming food */
const QUICK_WORDS = new Set(["quick", "fast", "easy", "weeknight", "simple", "speedy", "busy", "lazy"]);

const DESCRIPTORS = new Set([
  "fresh", "large", "small", "medium", "boneless", "skinless", "ground", "chopped", "sliced", "diced", "minced",
  "frozen", "cooked", "uncooked", "whole", "raw", "dried", "dry", "baby", "organic", "lean", "extra", "virgin",
  "low", "reduced", "sodium", "fat", "free", "range", "of", "and", "or", "to", "taste", "for", "serving", "heavy",
]);

/** Ingredients that never make a dish feel like "chicken + X" */
const SUPPORTING = new Set([
  "garlic", "onion", "shallot", "scallion", "leek", "butter", "broth", "stock", "sauce", "soy", "vinegar", "juice",
  "zest", "spice", "seasoning", "cumin", "paprika", "oregano", "thyme", "rosemary", "parsley", "cilantro", "basil",
  "dill", "bay", "leaf", "cinnamon", "nutmeg", "vanilla", "extract", "ginger", "sugar", "honey", "syrup", "salt",
  "pepper", "flake", "powder", "cornstarch", "starch", "water", "oil", "sesame", "mustard", "mayonnaise", "ketchup",
  "wine", "chili", "chile", "green", "red", "white", "black", "yellow", "clove", "sprig", "pinch",
]);

/** Pairing candidates in order of how much they define a dish */
const MAINS = [
  "rice", "pasta", "noodle", "potato", "quinoa", "couscous", "bread", "tortilla", "broccoli", "spinach",
  "mushroom", "tomato", "bell pepper", "zucchini", "cauliflower", "kale", "sweet potato", "carrot", "pea",
  "corn", "bean", "chickpea", "lentil", "avocado", "egg", "cheese", "tofu", "chicken", "beef", "pork",
  "salmon", "shrimp", "lemon",
];

/** Display forms for suggestion chips ("Eggs", not "Egg") */
const PLURAL: Record<string, string> = {
  noodle: "noodles", egg: "eggs", mushroom: "mushrooms", bean: "beans", pea: "peas", lentil: "lentils",
  chickpea: "chickpeas", potato: "potatoes", tomato: "tomatoes", "sweet potato": "sweet potatoes",
};

/** Generic dish types that would make everything "similar" to everything */
const GENERIC_DISH = new Set(["main course", "main dish", "dinner", "lunch"]);

const SYNONYMS: Record<string, string[]> = {
  pasta: ["spaghetti", "penne", "linguine", "fettuccine", "macaroni", "rigatoni", "fusilli", "orzo", "lasagna", "noodle"],
  noodle: ["ramen", "udon", "soba", "vermicelli", "pasta", "spaghetti"],
  spaghetti: ["pasta"],
  fish: ["salmon", "cod", "tuna", "tilapia", "halibut", "trout", "seafood"],
  seafood: ["shrimp", "prawn", "salmon", "fish", "crab", "scallop", "mussel"],
  shrimp: ["prawn"],
  prawn: ["shrimp"],
  beef: ["steak", "brisket"],
  steak: ["beef"],
  veggie: ["vegetarian", "vegetable"],
  veg: ["vegetarian", "vegetable"],
  vegetable: ["vegetarian", "veggie"],
  dessert: ["cake", "cookie", "pie", "brownie", "pudding"],
  breakfast: ["brunch", "morning", "pancake", "omelet", "oatmeal"],
  soup: ["stew", "chowder"],
  stew: ["soup"],
  egg: ["omelet", "frittata"],
  chickpea: ["garbanzo"],
  cilantro: ["coriander"],
};

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map(singular);
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** ["a"] -> "a", ["a","b"] -> "a or b", ["a","b","c"] -> "a, b or c" */
function joinList(items: string[], last: "or" | "and"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`;
}

/** "Boneless skinless chicken breasts" -> "chicken breasts" (keeps the recipe's own wording) */
export function shortIngredientName(name: string): string {
  const parts = name.toLowerCase().trim().split(/\s+/);
  while (parts.length > 1 && DESCRIPTORS.has(parts[0])) parts.shift();
  return parts.join(" ");
}

function isSupporting(name: string): boolean {
  const w = words(name).filter((x) => !DESCRIPTORS.has(x));
  return w.length === 0 || w.every((x) => SUPPORTING.has(x));
}

function mainRank(name: string): number {
  const i = MAINS.findIndex((m) => ingredientMatches(m, name));
  return i === -1 ? MAINS.length : i;
}

/** Trim, strip odd characters, collapse whitespace, cap at 60 chars. Lowercase. */
export function normalizeQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s'&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .trim();
}

/* ------------------------------------------------------------------ */
/* Filters + query params                                              */
/* ------------------------------------------------------------------ */

export function isDiet(value: unknown): value is DietFilter {
  return typeof value === "string" && (DIETS as readonly string[]).includes(value);
}

function fitsDiet(recipe: Recipe, diet: DietFilter): boolean {
  const d = recipe.diets.map((x) => x.toLowerCase());
  if (diet === "vegetarian") return d.some((x) => x.includes("vegetarian") || x === "vegan");
  return d.includes(diet);
}

export function applyFilters(recipes: Recipe[], filters: SearchFilters = {}): Recipe[] {
  const { maxMinutes, diet } = filters;
  return recipes.filter(
    (r) => (maxMinutes == null || r.readyInMinutes <= maxMinutes) && (diet == null || fitsDiet(r, diet)),
  );
}

/** URLSearchParams -> validated query + options (server side of toSearchParams) */
export function parseSearchParams(params: URLSearchParams): { query: string; options: SearchOptions } {
  const query = normalizeQuery((params.get("q") ?? "").slice(0, 200));
  const options: SearchOptions = {};
  const have = parseIngredientsParam(params.get("have"));
  if (have.length) options.have = have;
  const maxTime = params.get("maxTime");
  if (maxTime && /^\d{1,3}$/.test(maxTime)) {
    const n = Number(maxTime);
    if (n >= 5 && n <= 240) options.maxMinutes = n;
  }
  const diet = params.get("diet");
  if (isDiet(diet)) options.diet = diet;
  return { query, options };
}

export function toSearchParams(query: string, options: SearchOptions = {}): URLSearchParams {
  const qs = new URLSearchParams({ q: normalizeQuery(query) });
  if (options.have?.length) qs.set("have", options.have.slice(0, 25).join(","));
  if (options.maxMinutes) qs.set("maxTime", String(options.maxMinutes));
  if (options.diet) qs.set("diet", options.diet);
  return qs;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

interface Term {
  /** As typed (lowercase), for display: "eggs" */
  raw: string;
  /** [singular word, ...synonyms] */
  alts: string[];
  /** The last word while typing: also matches word prefixes ("salm" -> salmon) */
  prefix: boolean;
}

interface ParsedQuery {
  text: string;
  terms: Term[];
  quick: boolean;
}

function parseQuery(query: string): ParsedQuery {
  const text = normalizeQuery(query);
  const rawWords = text.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  let quick = false;
  const terms: Term[] = [];
  rawWords.forEach((raw, i) => {
    if (QUICK_WORDS.has(raw)) {
      quick = true;
      return;
    }
    if (STOPWORDS.has(raw) || /^\d+$/.test(raw)) return;
    const word = singular(raw);
    if (terms.some((t) => t.alts[0] === word)) return;
    terms.push({ raw, alts: [word, ...(SYNONYMS[word] ?? [])], prefix: i === rawWords.length - 1 && raw.length >= 3 });
  });
  return { text, terms, quick };
}

/** True when the query names something (not just "quick", "a recipe" or a number) */
export function hasSearchTerms(query: string): boolean {
  return parseQuery(query).terms.length > 0;
}

interface Indexed {
  title: string[];
  titleText: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  ingredientNames: string[];
  ingredientWords: string[];
}

const INDEX = new WeakMap<Recipe, Indexed>();

function indexed(recipe: Recipe): Indexed {
  let ix = INDEX.get(recipe);
  if (!ix) {
    const ingredientNames = recipe.ingredients.filter((i) => !isPantry(i.name)).map((i) => i.name);
    ix = {
      title: words(recipe.title),
      titleText: words(recipe.title).join(" "),
      cuisines: recipe.cuisines.flatMap(words),
      dishTypes: recipe.dishTypes.flatMap(words),
      diets: recipe.diets.flatMap(words),
      ingredientNames,
      ingredientWords: ingredientNames.flatMap(words),
    };
    INDEX.set(recipe, ix);
  }
  return ix;
}

function hasWord(list: string[], alt: string, prefix: boolean): "exact" | "prefix" | null {
  const altWords = alt.split(" ");
  if (altWords.every((w) => list.includes(w))) return "exact";
  if (prefix && altWords.length === 1 && list.some((w) => w.startsWith(alt))) return "prefix";
  return null;
}

/** True when the recipe actually contains this ingredient (not just a title mention) */
function usesIngredient(term: Term, ix: Indexed): boolean {
  return term.alts.some((alt) => ix.ingredientNames.some((n) => ingredientMatches(alt, n)));
}

function termScore(term: Term, ix: Indexed): number {
  let best = 0;
  term.alts.forEach((alt, i) => {
    const weight = i === 0 ? 1 : 0.75;
    const prefix = term.prefix && i === 0;
    const field = (list: string[], points: number) => {
      const hit = hasWord(list, alt, prefix);
      return hit === "exact" ? points : hit === "prefix" ? points * 0.7 : 0;
    };
    const ingredient = ix.ingredientNames.some((n) => ingredientMatches(alt, n)) ? 5 : field(ix.ingredientWords, 5);
    const hits = [field(ix.title, 10), ingredient, field(ix.cuisines, 6), field(ix.dishTypes, 4), field(ix.diets, 5)].filter(
      (s) => s > 0,
    );
    if (!hits.length) return;
    best = Math.max(best, (Math.max(...hits) + (hits.length - 1) * 1.5) * weight);
  });
  return best;
}

function dedupeById(recipes: Recipe[]): Recipe[] {
  const seen = new Set<number>();
  return recipes.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function scoreMatches(parsed: ParsedQuery, pool: Recipe[]): Map<number, number> {
  const scores = new Map<number, number>();
  // Words that hit nothing at all (typos, "tonight") don't count against coverage.
  const considered = parsed.terms.filter((t) => pool.some((r) => termScore(t, indexed(r)) > 0));
  if (considered.length === 0 && !parsed.quick) return scores;

  for (const recipe of pool) {
    const ix = indexed(recipe);
    let score = 0;
    let hit = 0;
    for (const t of considered) {
      const s = termScore(t, ix);
      if (s > 0) {
        score += s;
        hit += 1;
      }
    }
    if (considered.length) {
      if (hit === 0) continue;
      score *= hit / considered.length;
      if (considered.length > 1 && ix.titleText.includes(considered.map((t) => t.alts[0]).join(" "))) score += 6;
    }
    if (parsed.quick) {
      if (recipe.readyInMinutes <= 30) score += considered.length ? 4 : 1 + (30 - recipe.readyInMinutes) / 30;
      else if (!considered.length) continue;
    }
    if (score > 0) scores.set(recipe.id, score);
  }
  return scores;
}

interface Combination {
  recipe: Recipe;
  pairs: string[];
  haveCount: number;
  rank: number;
}

function buildCombinations(
  parsed: ParsedQuery,
  pool: Recipe[],
  have: string[],
  scores: Map<number, number>,
): { anchor: Term[]; list: Combination[] } {
  const anchor = parsed.terms.filter((t) => pool.some((r) => usesIngredient(t, indexed(r))));
  if (!anchor.length) return { anchor, list: [] };

  const list: Combination[] = [];
  for (const recipe of pool) {
    const ix = indexed(recipe);
    if (!anchor.every((t) => usesIngredient(t, ix))) continue;
    const seen = new Set<string>();
    const notable = recipe.ingredients.filter((ing) => {
      const name = shortIngredientName(ing.name);
      if (seen.has(name) || isPantry(ing.name) || isSupporting(ing.name)) return false;
      if (anchor.some((t) => t.alts.some((alt) => ingredientMatches(alt, ing.name)))) return false;
      seen.add(name);
      return true;
    });
    const fromFridge = notable.filter((ing) => have.some((h) => ingredientMatches(h, ing.name)));
    const ranked = fromFridge.length ? fromFridge : [...notable].sort((a, b) => mainRank(a.name) - mainRank(b.name));
    if (!ranked.length) continue;
    list.push({
      recipe,
      pairs: ranked.slice(0, 2).map((i) => shortIngredientName(i.name)),
      haveCount: fromFridge.length,
      rank: mainRank(ranked[0].name),
    });
  }
  list.sort(
    (a, b) =>
      b.haveCount - a.haveCount ||
      a.rank - b.rank ||
      (scores.get(b.recipe.id) ?? 0) - (scores.get(a.recipe.id) ?? 0) ||
      a.recipe.readyInMinutes - b.recipe.readyInMinutes,
  );
  return { anchor, list: list.slice(0, MAX_COMBINATIONS) };
}

function combinationsLabel(anchor: Term[], list: Combination[]): string {
  if (!list.length) return "";
  const subject = capitalize(anchor.map((t) => t.raw).join(" & "));
  const fromFridge = [...new Set(list.filter((c) => c.haveCount > 0).map((c) => c.pairs[0]))];
  if (fromFridge.length) return `${subject} + your ${joinList(fromFridge.slice(0, 2), "and")}`;
  const pairs = [...new Set(list.map((c) => c.pairs[0]))].slice(0, 3);
  return `${subject} with ${joinList(pairs, "or")}`;
}

function buildSimilar(seeds: Recipe[], pool: Recipe[], listed: Set<number>): { list: Recipe[]; label: string } {
  if (!seeds.length) return { list: [], label: "" };
  const cuisines = new Set(seeds.flatMap((r) => r.cuisines.map((c) => c.toLowerCase())));
  const dishes = new Set(seeds.flatMap((r) => r.dishTypes.map((d) => d.toLowerCase())));
  const diets = new Set(seeds.flatMap((r) => r.diets.map((d) => d.toLowerCase())));

  const scored = pool
    .filter((r) => !listed.has(r.id))
    .map((r) => {
      const sharedCuisine = r.cuisines.find((c) => cuisines.has(c.toLowerCase()));
      const sharedDish = r.dishTypes.filter((d) => dishes.has(d.toLowerCase()));
      const specific = sharedDish.find((d) => !GENERIC_DISH.has(d.toLowerCase()));
      let score = sharedCuisine ? 3 : 0;
      score += sharedDish.reduce((s, d) => s + (GENERIC_DISH.has(d.toLowerCase()) ? 1 : 2), 0);
      score += r.diets.filter((d) => diets.has(d.toLowerCase())).length * 0.5;
      return { r, score, sharedCuisine, specific };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.r.readyInMinutes - b.r.readyInMinutes);

  if (!scored.length) {
    const quickest = pool
      .filter((r) => !listed.has(r.id))
      .sort((a, b) => a.readyInMinutes - b.readyInMinutes)
      .slice(0, 6);
    return { list: quickest, label: quickest.length ? "Quick ones you might like" : "" };
  }

  const top = scored[0];
  const generic = top.r.dishTypes.map((d) => d.toLowerCase()).find((d) => d === "dinner" || d === "lunch");
  const label = top.sharedCuisine
    ? `More ${capitalize(top.sharedCuisine)} cooking`
    : top.specific
      ? `More ${top.specific.toLowerCase()} ideas`
      : generic
        ? `More ${generic} ideas`
        : "More mains like these";
  return { list: scored.slice(0, MAX_SIMILAR).map((x) => x.r), label };
}

/**
 * Build the planner's three sections for a query.
 * `pinned` = recipes that must appear in Matches (live Spoonacular results for the query).
 */
export function searchRecipes(
  query: string,
  options: SearchOptions = {},
  pool: Recipe[] = getCatalog(),
  pinned: Recipe[] = [],
): PlannerSearchResponse {
  const parsed = parseQuery(query);
  const candidates = applyFilters(dedupeById([...pool, ...pinned]), options).filter((r) => r.steps.length > 0);
  const pinnedOk = applyFilters(pinned, options).filter((r) => r.steps.length > 0);
  const empty: PlannerSearchResponse = {
    query: parsed.text,
    matches: [],
    combinations: [],
    similar: [],
    source: pinnedOk.length ? "live" : "cache",
    labels: { combinations: "", similar: "" },
    anchor: null,
    pairs: {},
  };
  if (!parsed.text) return empty;

  const scores = scoreMatches(parsed, candidates);
  const scored = candidates
    .filter((r) => scores.has(r.id))
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || a.readyInMinutes - b.readyInMinutes);
  const matches = dedupeById([...scored, ...pinnedOk]).slice(0, MAX_MATCHES);

  const combos = buildCombinations(parsed, candidates, options.have ?? [], scores);
  const combinations = combos.list.map((c) => c.recipe);
  const pairs: Record<string, string[]> = {};
  for (const c of combos.list) pairs[String(c.recipe.id)] = c.pairs;

  const listed = new Set([...matches, ...combinations].map((r) => r.id));
  const similar = buildSimilar((matches.length ? matches : combinations).slice(0, 3), candidates, listed);

  return {
    ...empty,
    matches,
    combinations,
    similar: similar.list,
    labels: { combinations: combinationsLabel(combos.anchor, combos.list), similar: similar.label },
    anchor: combos.anchor.length ? combos.anchor.map((t) => t.raw).join(" & ") : null,
    pairs,
  };
}

/* ------------------------------------------------------------------ */
/* Browse helpers (empty query)                                        */
/* ------------------------------------------------------------------ */

/** Up to `max` short tags for a card: cuisine first, then a notable diet, then a dish type */
export function recipeTags(recipe: Recipe, max = 2): string[] {
  const out: string[] = [];
  if (recipe.cuisines[0]) out.push(recipe.cuisines[0]);
  const diet = recipe.diets.find((d) => /vegan|vegetarian|gluten free|dairy free|keto|paleo/i.test(d));
  if (diet) out.push(diet.replace(/lacto ovo /i, ""));
  const dish = recipe.dishTypes.find((d) => !GENERIC_DISH.has(d.toLowerCase()));
  if (dish) out.push(dish);
  return [...new Set(out.map(capitalize))].slice(0, max);
}

/** Cuisines in the pool with their recipe counts, most common first */
export function cuisineCounts(pool: Recipe[] = getCatalog()): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of pool) for (const c of r.cuisines) counts.set(capitalize(c), (counts.get(capitalize(c)) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Queries guaranteed to find something in the pool (for empty states and quick chips) */
export function searchSuggestions(pool: Recipe[] = getCatalog(), n = 5): string[] {
  const counts = new Map<string, number>();
  for (const r of pool) {
    const seen = new Set<string>();
    for (const ing of r.ingredients) {
      if (isPantry(ing.name) || isSupporting(ing.name)) continue;
      const main = MAINS[mainRank(ing.name)];
      const word = main ? (PLURAL[main] ?? main) : shortIngredientName(ing.name);
      if (!word || word.split(" ").length > 2 || seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + (main ? 1.5 : 1));
    }
  }
  const ingredients = [...counts].sort((a, b) => b[1] - a[1]).map(([w]) => capitalize(w));
  const cuisines = cuisineCounts(pool).map((c) => c.name);
  return [...new Set([...ingredients.slice(0, Math.max(1, n - 1)), ...cuisines.slice(0, 1), ...ingredients])].slice(0, n);
}

/** True when a query would return at least one match from the pool */
export function hasResults(query: string, options: SearchOptions = {}, pool: Recipe[] = getCatalog()): boolean {
  return searchRecipes(query, options, pool).matches.length > 0;
}
