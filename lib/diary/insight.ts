/**
 * The Sous tip on "Highlighted nutrients" (Figma 3.2), written locally from the week's
 * averages: the goal nutrient furthest below target, else a limit that's over, else a
 * well-done line. `query` is what "Plan it for me" searches the planner for.
 */
import type { NutrientRow } from "@/lib/diary/stats";
import type { NutrientKey } from "@/lib/nutrients";

export interface NutrientInsight {
  key: NutrientKey | null;
  text: string;
  /** Planner search for "Plan it for me" (null = open the planner as is) */
  query: string | null;
}

interface Suggestion {
  /** "iron", "vitamin A" */
  noun: string;
  /** Finishes "Want me to plan two …?" */
  plan: string;
  query: string;
}

/** Foods that fix a shortfall, per nutrient */
const LOW: Partial<Record<NutrientKey, Suggestion>> = {
  iron: { noun: "iron", plan: "iron-rich dinners — like lentil curry or spinach steak salad", query: "spinach" },
  fiber: { noun: "fiber", plan: "fiber-packed dinners — like black bean chili or lentil soup", query: "lentils" },
  vitaminA: { noun: "vitamin A", plan: "vitamin A-rich dinners — like sweet potato curry or carrot ginger soup", query: "sweet potato" },
  calcium: { noun: "calcium", plan: "calcium-rich dinners — like spinach feta pasta or a tofu stir fry", query: "tofu" },
  vitaminC: { noun: "vitamin C", plan: "vitamin C-rich dinners — like a pepper stir fry or broccoli chicken", query: "broccoli" },
  vitaminD: { noun: "vitamin D", plan: "vitamin D-rich dinners — like lemon garlic salmon or a mushroom frittata", query: "salmon" },
  potassium: { noun: "potassium", plan: "potassium-rich dinners — like a white bean stew or loaded baked potatoes", query: "beans" },
  protein: { noun: "protein", plan: "protein-packed dinners — like chicken fajitas or a lentil bolognese", query: "chicken" },
  carbs: { noun: "carbs", plan: "hearty dinners — like a chicken rice bowl or a pasta bake", query: "pasta" },
  fat: { noun: "healthy fats", plan: "dinners with good fats — like salmon with avocado salsa", query: "avocado" },
};

/** Lighter swaps when a limit runs over */
const OVER: Partial<Record<NutrientKey, Suggestion>> = {
  sodium: { noun: "sodium", plan: "lower-sodium dinners — like herb roast chicken or a fresh grain bowl", query: "grain bowl" },
  sugar: { noun: "sugar", plan: "low-sugar dinners — like a veggie omelette or a salmon salad", query: "salad" },
  saturatedFat: { noun: "saturated fat", plan: "leaner dinners — like a fish taco bowl or a chicken stir fry", query: "stir fry" },
  cholesterol: { noun: "cholesterol", plan: "plant-forward dinners — like a chickpea curry or bean burritos", query: "chickpea" },
};

export function nutrientInsight(rows: NutrientRow[]): NutrientInsight {
  const low = rows
    .filter((r) => r.def.kind === "goal" && r.def.key !== "calories" && (r.status === "low" || r.status === "a-bit-low") && LOW[r.def.key])
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (low) {
    const s = LOW[low.def.key] as Suggestion;
    const how = low.status === "low" ? "low on" : "a bit low on";
    return { key: low.def.key, text: `You’re ${how} ${s.noun} this week. Want me to plan two ${s.plan}?`, query: s.query };
  }
  const over = rows.filter((r) => r.def.kind === "limit" && r.status === "over" && OVER[r.def.key]).sort((a, b) => b.ratio - a.ratio)[0];
  if (over) {
    const s = OVER[over.def.key] as Suggestion;
    return { key: over.def.key, text: `Your ${s.noun} ran high this week. Want me to plan two ${s.plan}?`, query: s.query };
  }
  return { key: null, text: "You hit your nutrient targets this week. Want me to plan a few more dinners like these?", query: null };
}
