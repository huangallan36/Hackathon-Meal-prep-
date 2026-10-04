/**
 * The cached recipe catalog (data/recipes.json, written by scripts/seed-recipes.mjs)
 * plus local ingredient matching. Safe on client and server: the client uses it for
 * seed posts, the meal planner and as a last-resort fallback when the network is down.
 */
import rawRecipes from "@/data/recipes.json";
import youtube from "@/data/youtube.json";
import type { Ingredient, Recipe, RecipeMatch } from "@/lib/types";
import { normalizeRecipe, type SpoonacularRecipeInfo } from "./normalize";

const YT = youtube as Record<string, string>;

const CATALOG: Recipe[] = (rawRecipes as unknown as SpoonacularRecipeInfo[])
  .map((r) => normalizeRecipe(r, YT[String(r.id)]))
  .filter((r) => r.steps.length > 0);

export function getCatalog(): Recipe[] {
  return CATALOG;
}

export function getCachedRecipe(id: number): Recipe | undefined {
  return CATALOG.find((r) => r.id === id);
}

/** Attach the hardcoded tutorial to a live recipe if we have one */
export function youtubeIdFor(id: number): string | undefined {
  return YT[String(id)];
}

/* ------------------------------------------------------------------ */
/* Ingredient matching                                                  */
/* ------------------------------------------------------------------ */

/** Pantry staples never count as "missing" */
export const PANTRY = new Set([
  "salt", "pepper", "black pepper", "salt and pepper", "kosher salt", "sea salt", "water", "ice",
  "oil", "olive oil", "extra virgin olive oil", "vegetable oil", "canola oil", "cooking oil", "cooking spray",
  "sugar", "flour", "all purpose flour", "baking soda", "baking powder",
]);

const DESCRIPTORS = new Set([
  "fresh", "large", "small", "medium", "red", "green", "yellow", "white", "brown", "boneless", "skinless",
  "ground", "chopped", "sliced", "diced", "minced", "frozen", "cooked", "uncooked", "whole", "low", "fat",
  "sodium", "reduced", "lean", "extra", "virgin", "raw", "dried", "dry", "baby", "organic", "free", "range",
  "of", "and", "or", "with", "the", "a", "to", "taste", "for", "serving",
]);

/** Tokens too generic to match on their own ("soy sauce" vs "hot sauce") */
const WEAK = new Set(["sauce", "powder", "paste", "oil", "juice", "stock", "broth", "seasoning", "mix", "leaves", "seeds"]);

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !DESCRIPTORS.has(w))
    .map(singular);
}

export function isPantry(name: string): boolean {
  const n = name.toLowerCase().trim();
  return PANTRY.has(n) || PANTRY.has(tokens(n).join(" "));
}

/** True when a fridge item plausibly covers a recipe ingredient */
export function ingredientMatches(fridgeItem: string, ingredientName: string): boolean {
  const a = tokens(fridgeItem);
  const b = tokens(ingredientName);
  if (!a.length || !b.length) return false;
  if (a.join(" ") === b.join(" ")) return true;
  const shared = a.filter((t) => b.includes(t));
  return shared.some((t) => !WEAK.has(t));
}

export function matchRecipe(recipe: Recipe, fridge: string[]): RecipeMatch {
  const used = new Set<string>();
  const missing: Ingredient[] = [];
  for (const ing of recipe.ingredients) {
    if (isPantry(ing.name)) continue;
    const hit = fridge.find((f) => ingredientMatches(f, ing.name));
    if (hit) used.add(hit);
    else missing.push(ing);
  }
  return { recipe, used: [...used], missing };
}

/** Rank cached recipes by how well they use the fridge (most used first, then fewest missing) */
export function rankByIngredients(fridge: string[], limit = 8, recipes: Recipe[] = CATALOG): RecipeMatch[] {
  return recipes
    .map((r) => matchRecipe(r, fridge))
    .sort((x, y) => y.used.length - x.used.length || x.missing.length - y.missing.length)
    .slice(0, limit);
}
