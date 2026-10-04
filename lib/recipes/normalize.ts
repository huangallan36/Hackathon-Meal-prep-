/**
 * Spoonacular -> Recipe normalization. Pure functions, safe on client and server.
 * The cache (data/recipes.json) stores raw Spoonacular "recipe information" objects,
 * so live responses and cached ones go through exactly the same code path.
 */
import type { Ingredient, Nutrition, Micros, Recipe, RecipeStep } from "@/lib/types";

/** Subset of Spoonacular's /recipes/{id}/information (and informationBulk) response we rely on */
export interface SpoonacularRecipeInfo {
  id: number;
  title: string;
  image?: string | null;
  imageType?: string;
  servings?: number;
  readyInMinutes?: number;
  sourceName?: string | null;
  creditsText?: string | null;
  sourceUrl?: string | null;
  summary?: string | null;
  instructions?: string | null;
  analyzedInstructions?: {
    name?: string;
    steps: { number: number; step: string; length?: { number: number; unit: string } }[];
  }[];
  extendedIngredients?: {
    id?: number;
    name?: string;
    nameClean?: string | null;
    original?: string;
    amount?: number;
    unit?: string;
    image?: string | null;
    aisle?: string | null;
  }[];
  cuisines?: string[];
  dishTypes?: string[];
  diets?: string[];
  nutrition?: { nutrients?: { name: string; amount: number; unit: string }[] };
}

const IMG = "https://img.spoonacular.com";

export function ingredientImage(file?: string | null): string | undefined {
  if (!file) return undefined;
  return /^https?:\/\//.test(file) ? file : `${IMG}/ingredients_100x100/${file}`;
}

export function recipeImage(id: number, imageType = "jpg", size = "556x370"): string {
  return `${IMG}/recipes/${id}-${size}.${imageType}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** First one or two sentences of the HTML summary, minus Spoonacular's boilerplate */
function shortSummary(html?: string | null): string | undefined {
  if (!html) return undefined;
  const text = stripHtml(html);
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const kept = sentences
    .filter((s) => !/spoonacular|score of|covers \d+%|users who liked|similar recipes|try /i.test(s))
    .slice(0, 2)
    .join(" ")
    .trim();
  return kept || undefined;
}

function steps(info: SpoonacularRecipeInfo): RecipeStep[] {
  const out: RecipeStep[] = [];
  for (const section of info.analyzedInstructions ?? []) {
    for (const s of section.steps ?? []) {
      const text = s.step?.trim();
      if (!text) continue;
      const minutes =
        s.length && /min/i.test(s.length.unit) ? s.length.number : s.length && /hour/i.test(s.length.unit) ? s.length.number * 60 : undefined;
      out.push({ number: out.length + 1, text, minutes });
    }
  }
  if (out.length === 0 && info.instructions) {
    // Fallback: split the free-text instructions into sentences, grouping short ones.
    const sentences = stripHtml(info.instructions).match(/[^.!?]+[.!?]+/g) ?? [];
    let buf = "";
    for (const s of sentences) {
      buf = buf ? `${buf} ${s.trim()}` : s.trim();
      if (buf.length > 80) {
        out.push({ number: out.length + 1, text: buf });
        buf = "";
      }
    }
    if (buf) out.push({ number: out.length + 1, text: buf });
  }
  return out;
}

function ingredients(info: SpoonacularRecipeInfo): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const i of info.extendedIngredients ?? []) {
    const name = (i.nameClean || i.name || "").toLowerCase().trim();
    const original = (i.original || name).trim();
    const key = `${name}|${original}`;
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: i.id,
      name,
      original,
      amount: i.amount,
      unit: i.unit || undefined,
      image: ingredientImage(i.image),
      aisle: i.aisle ?? undefined,
    });
  }
  return out;
}

function nutrition(info: SpoonacularRecipeInfo): (Nutrition & Partial<Micros>) | undefined {
  const list = info.nutrition?.nutrients;
  if (!list?.length) return undefined;
  const get = (name: string) => list.find((n) => n.name.toLowerCase() === name.toLowerCase())?.amount;
  const calories = get("Calories");
  if (calories == null) return undefined;
  const round = (n: number | undefined) => Math.round((n ?? 0) * 10) / 10;
  return {
    calories: Math.round(calories),
    protein: round(get("Protein")),
    carbs: round(get("Carbohydrates")),
    fat: round(get("Fat")),
    fiber: round(get("Fiber")),
    iron: get("Iron") != null ? round(get("Iron")) : undefined,
    calcium: get("Calcium") != null ? Math.round(get("Calcium")!) : undefined,
    vitaminA: get("Vitamin A") != null ? Math.round(get("Vitamin A")! * 0.3) : undefined, // IU -> mcg RAE (approx.)
  };
}

export function normalizeRecipe(info: SpoonacularRecipeInfo, youtubeId?: string): Recipe {
  return {
    id: info.id,
    title: info.title.trim(),
    image: info.image || recipeImage(info.id, info.imageType || "jpg"),
    readyInMinutes: info.readyInMinutes ?? 30,
    servings: info.servings ?? 2,
    sourceName: info.sourceName || info.creditsText || undefined,
    sourceUrl: info.sourceUrl || undefined,
    summary: shortSummary(info.summary),
    ingredients: ingredients(info),
    steps: steps(info),
    cuisines: info.cuisines ?? [],
    dishTypes: info.dishTypes ?? [],
    diets: info.diets ?? [],
    nutrition: nutrition(info),
    youtubeId,
  };
}
