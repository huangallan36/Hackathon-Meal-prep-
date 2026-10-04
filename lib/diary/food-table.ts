/**
 * Offline food estimator: ~60 common foods and drinks with typical single-portion
 * nutrition (USDA-like values), matched by keywords. Used when Gemini is unavailable
 * (server fallback for /api/nutrition/estimate, client fallback when offline) and by the
 * keyword intent router to tell "I had two eggs" from "I had a long day".
 * Pure data + functions (no browser or server APIs), safe on client and server.
 */
import { MICRO_KEYS } from "@/lib/nutrients";
import type { Micros, SpokenFood } from "@/lib/types";
import { heuristicMicros, roundMicro } from "./micros";

/** [calories, protein g, carbs g, fat g, fiber g] for ONE unit */
type N5 = [number, number, number, number, number];
/** [iron mg, calcium mg, potassium mg, vitamin A µg, vitamin C mg, vitamin D µg, sodium mg, sugar g, saturated fat g, cholesterol mg] (MICRO_KEYS order) */
type M10 = [number, number, number, number, number, number, number, number, number, number];

interface FoodRow {
  re: RegExp;
  name: string;
  /** Counted unit, singular + plural: "1 wrap", "2 large eggs" */
  unit: [string, string];
  /** Units assumed when the user doesn't say how many */
  qty: number;
  n: N5;
  m: M10;
  /** Name the item after what was said ("Oat milk latte") instead of `name` */
  named?: boolean;
}

const row = (re: RegExp, name: string, unit: [string, string], qty: number, n: N5, m: M10, named = false): FoodRow => ({
  re,
  name,
  unit,
  qty,
  n,
  m,
  named,
});

/**
 * First match wins and consumes its words, so specific dishes come before the generic
 * words inside them ("chicken caesar salad" before "salad", "oat milk latte" before "milk").
 */
const FOODS: FoodRow[] = [
  row(/\bchicken caesar(?: salad)?\b/, "Chicken caesar salad", ["bowl", "bowls"], 1, [480, 38, 18, 28, 4], [2.2, 200, 620, 380, 15, 0.3, 1100, 3, 7, 100]),
  row(/\bcaesar(?: salad)?\b/, "Caesar salad", ["bowl", "bowls"], 1, [360, 10, 16, 29, 3], [1.5, 180, 350, 250, 12, 0.2, 760, 3, 6, 30]),
  row(/\b(?:grilled |crispy |buffalo )?chicken wraps?\b|\bwraps? with chicken\b/, "Chicken wrap", ["wrap", "wraps"], 1, [520, 32, 48, 21, 4], [3, 150, 450, 60, 6, 0.2, 1150, 4, 6, 75]),
  row(/\b(?:chicken |beef |veggie |salmon |tuna |steak )?(?:burrito|rice|grain|poke|buddha|teriyaki|power|acai) bowls?\b|\bpoke\b/, "Rice bowl", ["bowl", "bowls"], 1, [620, 32, 78, 18, 8], [3.8, 130, 820, 180, 20, 0.5, 1100, 5, 5, 70], true),
  row(/\b(?:chicken |beef |bean |breakfast |steak )?burritos?\b/, "Burrito", ["burrito", "burritos"], 1, [680, 30, 80, 24, 10], [5, 250, 750, 150, 15, 0.2, 1500, 4, 9, 70], true),
  row(/\b(?:chicken |beef |fish |pork |shrimp )?tacos?\b/, "Tacos", ["taco", "tacos"], 2, [200, 10, 18, 10, 2], [1.4, 80, 220, 40, 3, 0.1, 350, 1.5, 4, 30], true),
  row(/\b(?:chicken |shrimp |veggie |vegetable |egg )?fried rice\b/, "Fried rice", ["plate", "plates"], 1, [520, 14, 72, 18, 3], [2, 50, 250, 200, 6, 0.4, 1200, 3, 3, 120], true),
  row(/\bsushi\b|\b(?:california|salmon|tuna|spicy tuna|dragon) rolls?\b|\bmaki\b|\bnigiri\b/, "Sushi", ["roll (8 pieces)", "rolls (8 pieces each)"], 1, [350, 14, 60, 5, 3], [1.2, 40, 300, 90, 3, 2.5, 800, 9, 1, 25]),
  row(/\b(?:ramen|pho|udon|noodle soup)\b/, "Ramen", ["bowl", "bowls"], 1, [550, 22, 70, 20, 4], [3, 80, 450, 80, 4, 0.5, 2100, 5, 6, 180], true),
  row(/\b(?:chicken noodle |tomato |lentil |vegetable |minestrone |miso |potato |mushroom )?soup\b|\bchili\b|\bstew\b/, "Soup", ["bowl", "bowls"], 1, [220, 10, 26, 8, 4], [1.8, 60, 500, 300, 8, 0.1, 950, 5, 2.5, 20], true),
  row(/\b(?:spaghetti(?: bolognese)?|penne|linguine|fettuccine|lasagna|mac(?:aroni)? (?:and|n) cheese|pasta(?: salad)?)\b/, "Pasta", ["plate", "plates"], 1, [600, 22, 85, 18, 6], [3.6, 160, 520, 150, 12, 0.2, 900, 9, 6, 40], true),
  row(/\b(?:garden |green |side |greek |cobb |chicken |kale |quinoa |tuna |egg )?salad\b/, "Salad", ["bowl", "bowls"], 1, [180, 6, 12, 12, 4], [1.4, 80, 450, 420, 25, 0.1, 300, 5, 2.5, 10], true),
  row(/\b(?:veggie |smash |beef |chicken |turkey )?burgers?\b|\bcheeseburgers?\b/, "Burger", ["burger", "burgers"], 1, [560, 30, 40, 31, 2], [4, 180, 450, 90, 2, 0.3, 1000, 8, 12, 90], true),
  row(/\b(?:french )?fries\b/, "French fries", ["medium serving", "medium servings"], 1, [320, 4, 42, 15, 4], [0.8, 18, 600, 0, 6, 0, 260, 0.3, 2.3, 0]),
  row(/\bpizzas?\b/, "Pizza", ["slice", "slices"], 2, [285, 12, 36, 10, 2.5], [2.6, 200, 180, 70, 2, 0.2, 640, 3.8, 4.5, 18]),
  row(/\b(?:turkey |ham |chicken |tuna |egg |club |breakfast |veggie |steak )?(?:sandwich(?:es)?|subs?|panini)\b|\bgrilled cheese\b|\bblts?\b/, "Sandwich", ["sandwich", "sandwiches"], 1, [450, 24, 42, 19, 4], [3, 200, 400, 80, 6, 0.3, 1150, 6, 6, 50], true),
  row(/\bavo(?:cado)? toast\b/, "Avocado toast", ["slice", "slices"], 1, [240, 6, 24, 14, 7], [1.5, 40, 450, 15, 6, 0, 330, 2.5, 2, 0]),
  row(/\b(?:veggie |turkey |falafel |tuna |hummus )?wraps?\b/, "Wrap", ["wrap", "wraps"], 1, [430, 18, 50, 17, 5], [2.8, 140, 380, 80, 10, 0.1, 900, 4, 5, 30], true),
  row(/\bbagels?\b/, "Bagel", ["bagel", "bagels"], 1, [280, 11, 55, 1.7, 2.4], [3.5, 90, 100, 0, 0, 0, 480, 6, 0.4, 0]),
  row(/\bcroissants?\b/, "Croissant", ["croissant", "croissants"], 1, [230, 5, 26, 12, 1.5], [1.1, 20, 70, 160, 0, 0.2, 260, 6, 7, 40]),
  row(/\bmuffins?\b/, "Muffin", ["muffin", "muffins"], 1, [420, 6, 58, 18, 2], [1.8, 80, 150, 60, 1, 0.2, 380, 32, 3.5, 50]),
  row(/\b(?:pancakes?|waffles?)\b/, "Pancakes", ["pancake", "pancakes"], 3, [90, 2.5, 13, 3, 0.5], [0.7, 80, 70, 20, 0, 0.2, 200, 3, 0.8, 22], true),
  row(/\bomelet(?:te)?s?\b/, "Omelette", ["omelette", "omelettes"], 1, [340, 24, 8, 23, 2], [3.1, 140, 400, 520, 15, 2.5, 600, 3, 8, 560]),
  row(/\bcereal\b/, "Cereal with milk", ["bowl", "bowls"], 1, [250, 9, 45, 4, 3], [8, 300, 400, 300, 6, 2.5, 280, 14, 2, 10]),
  row(/\b(?:oatmeal|porridge|overnight oats|oats)\b/, "Oatmeal", ["bowl", "bowls"], 1, [250, 9, 44, 5, 6], [2.5, 150, 300, 60, 1, 1, 120, 10, 1.2, 5]),
  row(/\b(?:protein|granola|energy|cereal|nut) bars?\b/, "Protein bar", ["bar", "bars"], 1, [210, 20, 22, 7, 5], [2, 150, 200, 0, 0, 0, 200, 6, 3, 5], true),
  row(/\bgranola\b/, "Granola", ["serving (1/2 cup)", "servings (1/2 cup each)"], 1, [240, 6, 38, 9, 4], [1.8, 40, 230, 0, 0.5, 0, 20, 14, 1.5, 0]),
  row(/\bprotein (?:shake|smoothie)s?\b/, "Protein shake", ["shake", "shakes"], 1, [200, 30, 10, 4, 2], [1.5, 400, 400, 150, 15, 3, 250, 4, 1, 20]),
  row(/\b(?:fruit |green |berry |banana |strawberry |mango )?smoothies?\b/, "Smoothie", ["smoothie (16 oz)", "smoothies (16 oz)"], 1, [280, 8, 56, 3, 6], [1, 200, 700, 100, 60, 1, 80, 42, 1, 5], true),
  row(/\b(?:(?:oat|almond|soy|skim|whole) milk |iced |vanilla |caramel |pumpkin spice |chai |matcha )?(?:lattes?|cappuccinos?|flat whites?|mochas?)\b/, "Latte", ["latte", "lattes"], 1, [190, 12, 18, 7, 0], [0.2, 400, 550, 130, 1, 2.9, 160, 17, 4.5, 30], true),
  row(/\b(?:iced |black |drip )?coffees?\b|\bespressos?\b|\bamericanos?\b|\bcold brew\b/, "Coffee", ["cup", "cups"], 1, [5, 0.3, 0, 0, 0], [0.1, 5, 115, 0, 0, 0, 5, 0, 0, 0], true),
  row(/\b(?:green |black |herbal |iced |chai |mint )?teas?\b|\bmatcha\b/, "Tea", ["cup", "cups"], 1, [2, 0, 0.5, 0, 0], [0.1, 0, 88, 0, 0, 0, 7, 0, 0, 0], true),
  row(/\b(?:orange |apple |fresh |green )?juice\b|\boj\b/, "Orange juice", ["cup", "cups"], 1, [112, 1.7, 26, 0.5, 0.5], [0.5, 27, 496, 25, 124, 0, 2, 21, 0.1, 0]),
  row(/\b(?:chocolate |oat |almond |soy |skim |whole )?milk\b/, "Milk", ["cup", "cups"], 1, [120, 8, 12, 5, 0], [0.1, 300, 370, 130, 0, 2.9, 115, 12, 3, 20], true),
  row(/\b(?:sodas?|cokes?|colas?|sprites?|pepsis?|soft drinks?|pop)\b/, "Soda", ["can", "cans"], 1, [140, 0, 39, 0, 0], [0.1, 7, 4, 0, 0, 0, 45, 39, 0, 0]),
  row(/\bbeers?\b/, "Beer", ["bottle", "bottles"], 1, [150, 1.6, 13, 0, 0], [0.1, 14, 96, 0, 0, 0, 14, 0, 0, 0]),
  row(/\b(?:red |white )?wine\b/, "Wine", ["glass", "glasses"], 1, [125, 0.1, 4, 0, 0], [0.7, 12, 190, 0, 0, 0, 6, 1, 0, 0], true),
  row(/\b(?:greek |vanilla |plain )?yog(?:h)?urts?\b|\bparfaits?\b/, "Greek yogurt", ["cup", "cups"], 1, [150, 17, 7, 4, 0], [0.1, 190, 240, 30, 0, 0, 60, 6, 2.5, 15], true),
  row(/\bice cream\b|\bgelato\b/, "Ice cream", ["scoop", "scoops"], 1, [140, 2.5, 16, 7, 0.5], [0.1, 85, 130, 75, 0.4, 0.1, 55, 14, 4.5, 30]),
  row(/\b(?:chocolate chip |oatmeal |sugar )?cookies?\b/, "Cookie", ["cookie", "cookies"], 1, [160, 2, 21, 8, 0.8], [0.8, 10, 60, 40, 0, 0, 110, 13, 4, 15], true),
  row(/\bdo(?:ugh)?nuts?\b/, "Donut", ["donut", "donuts"], 1, [260, 3.5, 31, 14, 1], [1.2, 25, 60, 5, 0, 0.5, 250, 14, 6, 15]),
  row(/\b(?:potato |tortilla )?chips\b|\bcrisps\b/, "Chips", ["bag (1 oz)", "bags (1 oz)"], 1, [150, 2, 15, 10, 1], [0.4, 7, 330, 0, 5, 0, 150, 0.1, 1.2, 0], true),
  row(/\b(?:dark |milk )?chocolate(?: bars?)?\b/, "Chocolate", ["bar (40 g)", "bars (40 g)"], 1, [220, 3, 24, 13, 3], [3, 30, 280, 10, 0, 0, 10, 19, 8, 3], true),
  row(/\b(?:peanut|almond) butter\b/, "Peanut butter", ["tablespoon", "tablespoons"], 1, [95, 3.5, 3.5, 8, 1], [0.3, 7, 105, 0, 0, 0, 75, 1.5, 1.6, 0], true),
  row(/\bbutter\b/, "Butter", ["tablespoon", "tablespoons"], 1, [100, 0.1, 0, 11.5, 0], [0, 3, 3, 97, 0, 0, 90, 0, 7.3, 31]),
  row(/\b(?:cream )?cheese\b/, "Cheese", ["slice (1 oz)", "slices (1 oz)"], 1, [110, 7, 0.4, 9, 0], [0.2, 200, 25, 75, 0, 0.2, 180, 0.1, 5.5, 28], true),
  row(/\bavocados?\b|\bguac(?:amole)?\b/, "Avocado", ["half avocado", "half avocados"], 1, [120, 1.5, 6, 11, 5], [0.4, 9, 360, 5, 7, 0, 5, 0.5, 1.6, 0]),
  row(/\bhummus\b/, "Hummus", ["serving (1/4 cup)", "servings (1/4 cup)"], 1, [100, 5, 9, 6, 3], [1.5, 30, 140, 1, 0, 0, 240, 0.2, 0.8, 0]),
  row(/\b(?:almonds|nuts|cashews|walnuts|peanuts|pistachios|trail mix)\b/, "Nuts", ["handful (1 oz)", "handfuls (1 oz)"], 1, [165, 6, 6, 14, 3.5], [1, 75, 200, 0, 0, 0, 1, 1.2, 1.1, 0], true),
  row(/\bbananas?\b/, "Banana", ["medium banana", "medium bananas"], 1, [105, 1.3, 27, 0.4, 3.1], [0.3, 6, 422, 4, 10, 0, 1, 14, 0.1, 0]),
  row(/\bapples?\b/, "Apple", ["medium apple", "medium apples"], 1, [95, 0.5, 25, 0.3, 4.4], [0.2, 11, 195, 5, 8.4, 0, 2, 19, 0.1, 0]),
  row(/\b(?:berries|blueberries|strawberries|raspberries|grapes|fruit(?: salad| cup)?|oranges?|mango|melon|watermelon)\b/, "Fruit", ["cup", "cups"], 1, [80, 1, 20, 0.4, 3.5], [0.4, 20, 230, 10, 50, 0, 2, 14, 0, 0], true),
  row(/\b(?:toast|bread)\b/, "Toast", ["slice", "slices"], 2, [80, 3, 14, 1, 1.2], [0.9, 40, 50, 0, 0, 0, 150, 1.5, 0.2, 0], true),
  row(/\b(?:scrambled |fried |boiled |hard boiled |poached )?eggs?\b/, "Eggs", ["large egg", "large eggs"], 2, [78, 6.3, 0.6, 5.3, 0], [0.9, 28, 69, 80, 0, 1, 71, 0.2, 1.6, 186], true),
  row(/\b(?:grilled |roast(?:ed)? |baked |fried |rotisserie )?chicken(?: breasts?| thighs?| tenders?| strips?| wings?)?\b/, "Chicken", ["serving (150 g)", "servings (150 g)"], 1, [250, 46, 0, 5.4, 0], [1.4, 22, 390, 14, 0, 0.2, 110, 0, 1.5, 130], true),
  row(/\b(?:grilled |baked |smoked )?salmon\b/, "Salmon", ["fillet (150 g)", "fillets (150 g)"], 1, [310, 33, 0, 19, 0], [0.5, 20, 600, 60, 0, 16, 90, 0, 3.5, 95], true),
  row(/\b(?:tuna|cod|tilapia|fish|shrimp|prawns)\b/, "Fish", ["serving (150 g)", "servings (150 g)"], 1, [200, 38, 0, 4, 0], [1, 30, 500, 30, 0, 3.5, 150, 0, 1, 80], true),
  row(/\b(?:steak|sirloin|ribeye|rib eye|filet mignon)s?\b/, "Steak", ["steak (200 g)", "steaks (200 g)"], 1, [460, 50, 0, 28, 0], [4, 30, 640, 0, 0, 0.2, 120, 0, 11, 160]),
  row(/\b(?:white |brown |steamed |jasmine )?rice\b/, "Rice", ["cup", "cups"], 1, [205, 4.3, 45, 0.4, 0.6], [1.9, 16, 55, 0, 0, 0, 2, 0.1, 0.1, 0], true),
  row(/\b(?:baked |mashed |sweet |roast(?:ed)? )?potato(?:es)?\b/, "Potato", ["medium potato", "medium potatoes"], 1, [160, 4, 37, 0.2, 4], [1.9, 26, 900, 2, 17, 0, 17, 2, 0.1, 0], true),
  row(/\b(?:broccoli|vegetables|veggies|carrots|spinach|green beans|asparagus)\b/, "Vegetables", ["cup", "cups"], 1, [50, 3, 10, 0.5, 4], [0.9, 50, 400, 300, 50, 0, 50, 3, 0.1, 0], true),
];

const SCAN = FOODS.map((f) => new RegExp(f.re.source, "g"));

/* ------------------------------------------------------------------ */
/* Quantities                                                          */
/* ------------------------------------------------------------------ */

const NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, couple: 2, few: 3, half: 0.5, double: 2,
};
const SIZES: Record<string, number> = {
  small: 0.7, mini: 0.6, tall: 0.75, medium: 1, regular: 1, large: 1.3, big: 1.3, grande: 1.3, venti: 1.6, huge: 1.6, extra: 1.3,
};
const CONTAINERS = new Set([
  "of", "slice", "slices", "piece", "pieces", "cup", "cups", "bowl", "bowls", "glass", "glasses", "can", "cans", "bottle",
  "bottles", "scoop", "scoops", "serving", "servings", "plate", "plates", "handful", "handfuls", "mug", "mugs", "order",
  "orders", "side", "bag", "bags", "bar", "bars", "shot", "shots", "fillet", "fillets", "tablespoon", "tablespoons", "tbsp",
]);

/** How many (and how big) from the words right before a food: "two large", "a couple of", "half a", "3 slices of" */
function quantityBefore(prefix: string): { qty: number | null; size: number } {
  const words = prefix.toLowerCase().replace(/[^a-z0-9.\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  let qty: number | null = null;
  let size = 1;
  for (let i = words.length - 1, steps = 0; i >= 0 && steps < 5; i--, steps++) {
    const w = words[i];
    if (CONTAINERS.has(w)) continue;
    if (SIZES[w] != null) {
      if (size === 1) size = SIZES[w];
      continue;
    }
    const n = NUMBERS[w] ?? (/^\d+(?:\.\d+)?$/.test(w) ? Number(w) : null);
    if (n == null) break;
    if (qty == null) qty = n;
    else if (w === "half") qty *= 0.5; // "half a sandwich"
  }
  return { qty: qty == null ? null : Math.min(6, Math.max(0.25, qty)), size };
}

/** No amount said: the row's default, or two when they used the plural of a counted unit ("cookies", "bagels") */
function defaultQty(food: FoodRow, said: string): number {
  const noun = food.unit[0].split(" ").pop() ?? "";
  const plural = said.endsWith("s") && noun.length > 2 && said.includes(noun) && !said.endsWith(noun);
  return plural && food.qty === 1 ? 2 : food.qty;
}

function fmtQty(q: number): string {
  if (q === 0.5) return "1/2";
  if (q === 0.25) return "1/4";
  return String(Math.round(q * 10) / 10);
}

/* ------------------------------------------------------------------ */
/* Building items                                                      */
/* ------------------------------------------------------------------ */

const round1 = (n: number) => Math.round(n * 10) / 10;

function capitalize(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

function microsOf(m: M10, factor: number): Partial<Micros> {
  const out: Partial<Micros> = {};
  MICRO_KEYS.forEach((k, i) => {
    out[k] = roundMicro(k, m[i] * factor);
  });
  return out;
}

function itemFrom(food: FoodRow, said: string, qty: number, size: number): SpokenFood {
  const factor = qty * size;
  const [kcal, p, c, f, fiber] = food.n;
  const unit = qty <= 1 ? food.unit[0] : food.unit[1];
  const sizeWord = size > 1.2 ? "large " : size < 0.8 ? "small " : "";
  return {
    name: (food.named ? capitalize(said.toLowerCase()) : food.name).slice(0, 60),
    portion: `${fmtQty(qty)} ${sizeWord}${unit}`.slice(0, 60),
    calories: Math.round(kcal * factor),
    protein: round1(p * factor),
    carbs: round1(c * factor),
    fat: round1(f * factor),
    fiber: round1(fiber * factor),
    micros: microsOf(food.m, factor),
  };
}

/** A typical plate (or snack) for something we can't identify, named after what was said */
function genericItem(name: string, kcal: number): SpokenFood {
  const n = { calories: kcal, protein: round1(kcal * 0.045), carbs: round1(kcal * 0.11), fat: round1(kcal * 0.04), fiber: round1(kcal * 0.01) };
  return { name: capitalize(name).slice(0, 60) || "Meal", portion: "1 serving", ...n, micros: heuristicMicros(n) };
}

/** Words that never name a food on their own ("I had", "for lunch", "a big", "some") */
const FILLER = new Set([
  "i", "im", "ive", "id", "had", "have", "has", "ate", "eaten", "eat", "eating", "drank", "drink", "drinking", "grabbed", "just",
  "also", "then", "my", "me", "for", "breakfast", "lunch", "dinner", "supper", "brunch", "snack", "snacks", "log", "logged",
  "track", "add", "record", "please", "sous", "hey", "ok", "okay", "so", "a", "an", "the", "some", "of", "today", "tonight",
  "this", "morning", "afternoon", "evening", "earlier", "too", "and", "with", "on", "in", "at", "from", "to", "it", "that",
  "was", "were", "is", "like", "about", "around", "maybe", "little", "bit", "side", "piece", "pieces", "slice", "slices",
  "cup", "cups", "glass", "bowl", "plate", "serving", "one", "two", "three", "four", "half", "couple", "few", "can",
  "bottle", "any", "another", "more", "extra", "quick", "yesterday", "after", "before", "now", "um", "uh", "plus", "or",
  "small", "large", "medium", "big", "regular", "mini", "huge", "lots", "lot", "of", "really", "very", "good", "great",
  "delicious", "tasty", "nice", "homemade", "leftover", "leftovers", "we", "us", "our", "you", "your",
]);

function meaningful(segment: string): string {
  const words = segment
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w.replace(/'/g, "")));
  return words.some((w) => w.length >= 3) ? words.join(" ") : "";
}

/**
 * Split a description into foods and estimate each from the table. Unknown leftovers
 * become a generic item named after them; text with no known food at all becomes one
 * generic ~400 kcal item. Always returns 1-8 items.
 */
export function localFoodEstimate(text: string): SpokenFood[] {
  const original = (typeof text === "string" ? text : "").replace(/\s+/g, " ").trim().slice(0, 300);
  const lower = original.toLowerCase();
  let work = lower;
  const hits: { index: number; item: SpokenFood }[] = [];

  FOODS.forEach((food, i) => {
    const re = SCAN[i];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(work)) && hits.length < 8) {
      if (!m[0]) {
        re.lastIndex++;
        continue;
      }
      const { qty, size } = quantityBefore(lower.slice(Math.max(0, m.index - 40), m.index));
      hits.push({ index: m.index, item: itemFrom(food, m[0], qty ?? defaultQty(food, m[0]), size) });
      // Blank the words out (same length) so generic rows can't match them again
      work = work.slice(0, m.index) + " ".repeat(m[0].length) + work.slice(m.index + m[0].length);
    }
  });

  if (!hits.length) {
    const name = meaningful(lower) || original;
    return [genericItem(name || "Meal", 400)];
  }

  // Whatever is left between separators and isn't filler is a food we don't know
  for (const segment of work.split(/,|;|\.|&|\+|\band\b|\bwith\b|\bplus\b|\bthen\b|\balso\b/)) {
    if (hits.length >= 8) break;
    const name = meaningful(segment);
    if (name.replace(/\s/g, "").length >= 4) hits.push({ index: lower.indexOf(name.split(" ")[0]), item: genericItem(name, 250) });
  }

  return hits
    .sort((a, b) => a.index - b.index)
    .slice(0, 8)
    .map((h) => h.item);
}

/** True when the text names at least one food or drink we know ("two eggs", "a latte") */
export function mentionsFood(text: string): boolean {
  const t = (typeof text === "string" ? text : "").toLowerCase();
  return FOODS.some((f) => f.re.test(t));
}
