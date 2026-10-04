import type { ISODate } from "@/lib/types";
import { addDays, formatDay, todayISO } from "@/lib/utils";
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
  if (filters.diet) parts.push(filters.diet[0].toUpperCase() + filters.diet.slice(1));
  if (filters.maxMinutes) parts.push(parts.length ? `under ${filters.maxMinutes} min` : `Under ${filters.maxMinutes} minutes`);
  return parts.join(", ") || "All recipes";
}

export function hasFilters(filters: SearchFilters): boolean {
  return filters.maxMinutes != null || filters.diet != null;
}
