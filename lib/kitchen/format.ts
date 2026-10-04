/** Display + speech strings for the kitchen screens. Pure functions. */
import type { Ingredient, Recipe, RecipeMatch } from "@/lib/types";

/** ["a"] -> "a", ["a","b"] -> "a and b", ["a","b","c"] -> "a, b and c" */
export function naturalList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "eggs, spinach, rice +4" for headers */
export function ingredientSummary(list: string[], shown = 3): string {
  if (list.length === 0) return "";
  const head = list.slice(0, shown).join(", ");
  return list.length > shown ? `${head} +${list.length - shown} more` : head;
}

/** TTS-friendly recipe title: "&" reads badly, and some titles shout */
export function spokenTitle(title: string): string {
  const t = title.replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
  return t === t.toUpperCase() ? t.toLowerCase() : t;
}

export function fridgeLine(ingredients: string[]): string {
  if (ingredients.length === 0) return "I couldn't spot much in there. Want to type a few ingredients instead?";
  return `I can see ${naturalList(ingredients.slice(0, 4))}${ingredients.length > 4 ? " and a few more things" : ""}. Want me to find some recipes?`;
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const spokenCount = (n: number) => NUMBER_WORDS[n] ?? String(n);

export function recipesLine(matches: RecipeMatch[]): string {
  if (matches.length === 0) return "I couldn't find a recipe for that combo. Try adding a couple more ingredients.";
  const best = matches[0];
  const ideas = matches.length === 1 ? "one idea" : `${spokenCount(matches.length)} ideas`;
  if (best.used.length === 0) return `I found ${ideas}. Tap one to see what you'd need.`;
  const tail = best.missing.length === 0 ? " and you have everything for it" : "";
  return `I found ${ideas}. The ${spokenTitle(best.recipe.title)} uses the most of what you have${tail}.`;
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Plain-text shopping list for the clipboard */
export function groceryText(recipe: Recipe, items: Ingredient[]): string {
  const lines = items.map((i) => `- ${i.original || i.name}`);
  return [`Groceries for ${recipe.title}`, ...lines, "", "Made with Sous"].join("\n");
}
