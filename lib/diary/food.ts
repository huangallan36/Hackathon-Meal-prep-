/**
 * Icon + tint for entries without a photo, picked from the dish name so a seeded
 * diary still reads as food at a glance.
 */
import {
  Apple,
  Banana,
  Beef,
  Cake,
  Carrot,
  Coffee,
  Cookie,
  Croissant,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Hamburger,
  IceCreamCone,
  Milk,
  Moon,
  Pizza,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Sun,
  Sunrise,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { MealType } from "@/lib/types";

/** Static icon table, looked up by key so components never create icons during render */
export const FOOD_ICONS = {
  pizza: Pizza,
  burger: Hamburger,
  shrimp: Shrimp,
  fish: Fish,
  sandwich: Sandwich,
  salad: Salad,
  soup: Soup,
  eggFried: EggFried,
  egg: Egg,
  beef: Beef,
  poultry: Drumstick,
  iceCream: IceCreamCone,
  cookie: Cookie,
  cake: Cake,
  coffee: Coffee,
  milk: Milk,
  banana: Banana,
  apple: Apple,
  carrot: Carrot,
  grain: Wheat,
  croissant: Croissant,
} satisfies Record<string, LucideIcon>;

export type FoodIconKey = keyof typeof FOOD_ICONS;

/** First match wins, so more specific dishes come first */
const RULES: [RegExp, FoodIconKey][] = [
  [/pizza/i, "pizza"],
  [/burger/i, "burger"],
  [/shrimp|prawn/i, "shrimp"],
  [/salmon|tuna|sushi|poke|fish|cod/i, "fish"],
  [/sandwich|toast|wrap|burrito|taco|crackers/i, "sandwich"],
  [/salad|greens/i, "salad"],
  [/soup|pho|ramen|curry|stew|chili/i, "soup"],
  [/omelette|egg/i, "eggFried"],
  [/beef|steak|bolognese|sausage/i, "beef"],
  [/chicken|turkey|teriyaki/i, "poultry"],
  [/ice cream|gelato/i, "iceCream"],
  [/cookie|chocolate|bar\b/i, "cookie"],
  [/cake|muffin|brownie/i, "cake"],
  [/latte|coffee|espresso/i, "coffee"],
  [/smoothie|milk|yogurt|cottage/i, "milk"],
  [/banana/i, "banana"],
  [/apple|peach|berries|fruit/i, "apple"],
  [/carrot|hummus|veggie/i, "carrot"],
  [/oat|granola|cereal|pasta|linguine|noodle|rice|pad thai/i, "grain"],
  [/croissant|pastry/i, "croissant"],
];

const MEAL_DEFAULT: Record<MealType, FoodIconKey> = {
  breakfast: "egg",
  lunch: "salad",
  dinner: "soup",
  snack: "apple",
};

export function foodIconKey(name: string, meal: MealType): FoodIconKey {
  return RULES.find(([re]) => re.test(name))?.[1] ?? MEAL_DEFAULT[meal];
}

/** Section header icon for each meal slot */
export const MEAL_SLOT_ICON: Record<MealType, LucideIcon> = {
  breakfast: Sunrise,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

/** Soft tile background + icon color per meal slot (token based) */
export const MEAL_TINT: Record<MealType, string> = {
  breakfast: "bg-butter-soft text-[color-mix(in_oklab,var(--color-carbs),black_28%)]",
  lunch: "bg-herb-soft text-herb",
  dinner: "bg-accent-soft text-accent-strong",
  snack: "bg-[color-mix(in_oklab,var(--color-fat)_14%,white)] text-fat",
};
