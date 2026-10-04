/**
 * The demo user's taste profile behind "For you" and the "Tuned to you" pill on the planner:
 * browse lists leave out what they avoid and lean towards what they're after.
 */
import { ingredientMatches } from "@/lib/recipes/catalog";
import type { Recipe } from "@/lib/types";

export const FOR_YOU = {
  /** Shown as "Tuned to you · {summary}" */
  summary: "high-protein, no shellfish",
  avoid: ["shrimp", "prawn", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "crawfish", "langoustine", "shellfish"],
} as const;

/** True when the recipe contains something the user avoids */
export function avoidedByUser(recipe: Recipe): boolean {
  return recipe.ingredients.some((i) => FOR_YOU.avoid.some((a) => ingredientMatches(a, i.name)));
}

/** Protein per serving, for "high-protein first" tie-breaks (0 when unknown) */
export function proteinOf(recipe: Recipe): number {
  return recipe.nutrition?.protein ?? 0;
}
