/** Grocery list derivation, quantities, price estimates and the static "Nearby stores". Pure, client-safe. */
import { isPantry, matchRecipe } from "@/lib/recipes/catalog";
import type { Ingredient, Recipe } from "@/lib/types";
import { uniqueIngredients } from "./sanitize";

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

/** Leading filler in a typed or spoken add: "add milk", "I need eggs", "and some limes" */
const FILLER = /^(?:(?:please|also|and|oh|um|uh|so|ok(?:ay)?)\s+)*(?:(?:add|get|buy|grab|put|i need|we need|i also need|need)\s+)?(?:(?:some|a|an|the|more)\s+)?/i;
/** Trailing filler: "milk to the list", "eggs too" */
const TAIL = /\s+(?:to (?:the|my) (?:list|groceries|cart)|too|as well|please)$/i;

/**
 * "add milk, eggs and paper towels to the list" -> ["milk", "eggs", "paper towels"].
 * Normalized like fridge chips (lowercase, no punctuation), deduped, at most 8.
 */
export function parseGroceryItems(text: string): string[] {
  const parts = text
    .replace(TAIL, "")
    .split(/\s*(?:,|;|\n|\band\b|\bplus\b|&)\s*/i)
    .map((p) => p.replace(FILLER, "").replace(TAIL, "").trim());
  return uniqueIngredients(parts, 8);
}

/* ------------------------------------------------------------------ */
/* Quantities                                                           */
/* ------------------------------------------------------------------ */

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

/** 1.5 -> "1½", 0.333 -> "⅓", 2 -> "2", 1.2 -> "1.2" */
function formatAmount(n: number): string {
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.02) return String(whole);
  const hit = FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.03);
  if (hit) return whole ? `${whole}${hit[1]}` : hit[1];
  return String(Math.round(n * 10) / 10);
}

const UNIT_ALIASES: [RegExp, string, string][] = [
  // pattern, singular, plural
  [/^(tbsps?|tablespoons?|tbs|tb)$/i, "tbsp", "tbsp"],
  [/^(tsps?|teaspoons?)$/i, "tsp", "tsp"],
  [/^(lbs?|pounds?)$/i, "lb", "lb"],
  [/^(oz|ounces?)$/i, "oz", "oz"],
  [/^(g|grams?|gr)$/i, "g", "g"],
  [/^(kg|kilograms?)$/i, "kg", "kg"],
  [/^(ml|milliliters?|millilitres?)$/i, "ml", "ml"],
  [/^(l|liters?|litres?)$/i, "L", "L"],
  [/^(cups?|c)$/i, "cup", "cups"],
];

/** Units that mean "however much" and read badly on a shopping list */
const VAGUE_UNITS = /^(servings?|pinch(es)?|dash(es)?|to taste|smalls?|mediums?|larges?)$/i;

/** "2 lb", "1 cup", "4 cloves", "2" ("" when the recipe gives no amount) */
export function quantityLabel(ingredient: Pick<Ingredient, "amount" | "unit">): string {
  const { amount, unit } = ingredient;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return "";
  const n = formatAmount(amount);
  const u = (unit ?? "").trim().replace(/\.$/, "");
  if (!u || VAGUE_UNITS.test(u)) return n;
  const alias = UNIT_ALIASES.find(([re]) => re.test(u));
  const label = alias ? (amount > 1 ? alias[2] : alias[1]) : u.toLowerCase();
  return `${n} ${label}`.slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Price estimates (rough, demo-grade: one typical pack per item)        */
/* ------------------------------------------------------------------ */

/** Typical Metro Vancouver shelf price for one pack/bunch/bottle, by Spoonacular aisle */
const AISLE_PRICES: [RegExp, number][] = [
  [/seafood/i, 10.99],
  [/meat/i, 8.49],
  [/cheese/i, 5.99],
  [/milk|eggs|dairy|refrigerated/i, 4.79],
  [/produce/i, 2.49],
  [/frozen/i, 4.99],
  [/bakery|bread/i, 3.99],
  [/pasta|rice|cereal|grain/i, 3.49],
  [/canned|jarred/i, 2.99],
  [/spices|seasonings/i, 3.29],
  [/oil|vinegar|dressing|condiments|ethnic|sauce/i, 4.29],
  [/nut|dried|baking|health|gourmet/i, 4.49],
  [/beverage|tea|coffee/i, 4.99],
];

/** When there's no aisle (custom items), a few name hints, then a generic default */
const NAME_PRICES: [RegExp, number][] = [
  [/salmon|shrimp|prawn|fish|cod|tuna/i, 10.99],
  [/beef|steak|chicken|pork|lamb|turkey|bacon|sausage/i, 8.49],
  [/cheese|parmesan|mozzarella|feta/i, 5.99],
  [/milk|yogurt|butter|cream|eggs?$/i, 4.79],
];

const DEFAULT_PRICE = 3.49;

/** Estimated cost of one grocery line, in dollars */
export function itemPrice(item: Pick<Ingredient, "name" | "aisle">): number {
  if (item.aisle) {
    const hit = AISLE_PRICES.find(([re]) => re.test(item.aisle as string));
    if (hit) return hit[1];
  }
  return NAME_PRICES.find(([re]) => re.test(item.name))?.[1] ?? DEFAULT_PRICE;
}

/** "Est. $18.40" for one store */
export function storeEstimate(store: NearbyStore, items: Pick<Ingredient, "name" | "aisle">[]): number {
  const base = items.reduce((sum, i) => sum + itemPrice(i), 0);
  return Math.round(base * store.priceFactor * 100) / 100;
}

export const formatDollars = (n: number) => `$${n.toFixed(2)}`;

/* ------------------------------------------------------------------ */
/* Nearby stores                                                        */
/* ------------------------------------------------------------------ */

export interface NearbyStore {
  name: string;
  /** What locals call it; fits the 162px card next to the "Cheapest" badge */
  short: string;
  area: string;
  km: number;
  /** Lowercase so it reads after the distance: "1.2 km · open till 11 PM" */
  hours: string;
  /** Relative basket price (1 = typical); drives the estimate and the "Cheapest" badge */
  priceFactor: number;
}

/** Static, demo-day list around SFU Burnaby, nearest first */
export const NEARBY_STORES: NearbyStore[] = [
  { name: "Nesters Market", short: "Nesters", area: "SFU UniverCity", km: 0.4, hours: "open till 10 PM", priceFactor: 1.08 },
  { name: "Save-On-Foods", short: "Save-On", area: "Burnaby Mountain area", km: 2.1, hours: "open till 11 PM", priceFactor: 0.94 },
  { name: "Safeway", short: "Safeway", area: "Lougheed", km: 4.3, hours: "open 24 hours", priceFactor: 1.03 },
  { name: "T&T Supermarket", short: "T&T", area: "Metropolis at Metrotown", km: 6.8, hours: "open till 10 PM", priceFactor: 0.97 },
];

/** Index of the store with the lowest basket price */
export const CHEAPEST_STORE = NEARBY_STORES.reduce(
  (best, s, i) => (s.priceFactor < NEARBY_STORES[best].priceFactor ? i : best),
  0,
);

export function directionsUrl(store: NearbyStore): string {
  const query = `${store.name} ${store.area.replace(/\s+area$/i, "")} Burnaby BC`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
