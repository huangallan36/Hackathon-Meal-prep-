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

/** What Sous says on the recipes screen about the best match (on-screen wording, digits and the real title) */
export function bestMatchLine(matches: RecipeMatch[]): string | null {
  const best = matches[0];
  if (!best) return null;
  if (best.used.length === 0) return "These don't use much from your fridge, but they're worth a look.";
  const missing = best.missing.length;
  if (missing === 0) return `${best.recipe.title} uses the most of what you have, and you have everything for it.`;
  const grab = missing <= 3 ? `Just ${plural(missing, "thing")} to grab.` : `You'd need ${missing} more things for it.`;
  return `${best.recipe.title} uses the most of what you have. ${grab}`;
}

export function minutesLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "Quick";
  const min = Math.round(minutes);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Plain-text shopping list for the share sheet / clipboard */
export function groceryText(recipe: Pick<Recipe, "title">, lines: string[]): string {
  return [`Groceries for ${recipe.title}`, ...lines.map((l) => `- ${l}`), "", "Made with Sous"].join("\n");
}

/** One shopping-list line: the recipe's own wording when it has one ("2 chicken breasts") */
export const groceryLine = (i: Pick<Ingredient, "name" | "original">) => i.original || i.name;
