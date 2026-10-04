import { minutesLabel } from "@/lib/kitchen/format";
import type { ISODate, Recipe } from "@/lib/types";
import { addDays, formatDay, toISODate, todayISO } from "@/lib/utils";
import type { SearchFilters } from "./search";

/** "today", "tomorrow" or "Tuesday": reads naturally after "for" / "on" */
export function dayPhrase(date: ISODate): string {
  const today = todayISO();
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  return formatDay(date, { weekday: "long" });
}

/** Heading for the filter-only browse view: "Vegetarian, under 30 min" */
export function filtersTitle(filters: SearchFilters): string {
  const parts: string[] = [];
  if (filters.leftovers) parts.push("Uses your leftovers");
  if (filters.highProtein) parts.push("High protein");
  if (filters.diet) parts.push(filters.diet[0].toUpperCase() + filters.diet.slice(1));
  if (filters.maxMinutes) parts.push(parts.length ? `under ${filters.maxMinutes} min` : `Under ${filters.maxMinutes} minutes`);
  return parts.map((p, i) => (i === 0 ? p : p[0].toLowerCase() + p.slice(1))).join(", ") || "All recipes";
}

export function hasFilters(filters: SearchFilters): boolean {
  return filters.maxMinutes != null || filters.diet != null || filters.highProtein === true || filters.leftovers === true;
}

/** Figma card meta: "30 min · 610 kcal", with "· 38g protein" for list rows */
export function recipeStats(recipe: Pick<Recipe, "readyInMinutes" | "nutrition">, withProtein = false): string {
  const parts = [minutesLabel(recipe.readyInMinutes)];
  const n = recipe.nutrition;
  if (n?.calories) parts.push(`${Math.round(n.calories)} kcal`);
  if (withProtein && n?.protein) parts.push(`${Math.round(n.protein)}g protein`);
  return parts.join(" · ");
}

/** "Made today", "Made yesterday", "Made Tue" (this week), "Made Mar 3"; without a date "Made recently" */
export function madeLabel(loggedAt?: number): string {
  if (!loggedAt) return "Made recently";
  const day = toISODate(new Date(loggedAt));
  const today = todayISO();
  if (day === today) return "Made today";
  if (day === addDays(today, -1)) return "Made yesterday";
  if (day > addDays(today, -7)) return `Made ${formatDay(day, { weekday: "short" })}`;
  return `Made ${formatDay(day)}`;
}
