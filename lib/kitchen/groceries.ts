/** Grocery list derivation + the static "Nearby stores" cards. Pure, client-safe. */
import { isPantry, matchRecipe } from "@/lib/recipes/catalog";
import type { Ingredient, Recipe } from "@/lib/types";

export interface GroceryPlan {
  /** Still to buy */
  need: Ingredient[];
  /** Covered by the fridge scan */
  have: Ingredient[];
  /** Salt, oil, flour... assumed to be in the pantry */
  pantry: Ingredient[];
  /** True when there was no fridge scan, so "need" is every non-pantry ingredient */
  noScan: boolean;
}

/** Recipes sometimes list one ingredient twice ("butter" for the pan and for the sauce) */
function uniqueByName(list: Ingredient[]): Ingredient[] {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.name) ? false : (seen.add(i.name), true)));
}

export function groceryPlan(recipe: Recipe, fridge: string[]): GroceryPlan {
  const pantry = uniqueByName(recipe.ingredients.filter((i) => isPantry(i.name)));
  if (fridge.length === 0) {
    return { need: uniqueByName(recipe.ingredients.filter((i) => !isPantry(i.name))), have: [], pantry, noScan: true };
  }
  const missing = uniqueByName(matchRecipe(recipe, fridge).missing);
  const missingNames = new Set(missing.map((i) => i.name));
  const have = uniqueByName(recipe.ingredients.filter((i) => !isPantry(i.name) && !missingNames.has(i.name)));
  return { need: missing, have, pantry, noScan: false };
}

/** Key for useKitchen.groceryChecked */
export const groceryKey = (recipeId: number, name: string) => `${recipeId}:${name}`;

export interface NearbyStore {
  name: string;
  area: string;
  km: number;
  hours: string;
  /** Short label for the logo tile */
  initials: string;
}

/** Static, demo-day list around SFU Burnaby, nearest first */
export const NEARBY_STORES: NearbyStore[] = [
  { name: "Nesters Market", area: "SFU UniverCity", km: 0.4, hours: "Open until 10 PM", initials: "NM" },
  { name: "Save-On-Foods", area: "Burnaby Mountain area", km: 2.1, hours: "Open until 11 PM", initials: "SO" },
  { name: "Safeway", area: "Lougheed", km: 4.3, hours: "Open 24 hours", initials: "SW" },
  { name: "T&T Supermarket", area: "Metropolis at Metrotown", km: 6.8, hours: "Open until 10 PM", initials: "TT" },
];

export function directionsUrl(store: NearbyStore): string {
  const query = `${store.name} ${store.area.replace(/\s+area$/i, "")} Burnaby BC`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
