/**
 * The sous-chef's tip on "Highlighted nutrients" (Figma 3.2), written locally from the week's
 * averages: the goal nutrient furthest below target, else a limit that's over, else a
 * well-done line. In the design's voice: "Iron’s been low this week. Want a couple of dinners
 * with more of it? Lentil curry or a spinach steak salad would do it." `query` is what
 * "Sure" searches the planner for.
 */
import type { NutrientRow } from "@/lib/diary/stats";
import type { NutrientKey } from "@/lib/nutrients";

export interface NutrientInsight {
  key: NutrientKey | null;
  text: string;
  /** Planner search for "Sure" (null = open the planner as is) */
  query: string | null;
}

interface Suggestion {
  /** Sentence start: "Iron", "Vitamin A", "Healthy fats" */
  noun: string;
  /** "Healthy fats have been low" rather than "…’s been low" */
  plural?: boolean;
  /** Two dinners that fix it, finishing "… would do it." */
  ideas: string;
  query: string;
}

/** Dinners that fix a shortfall, per nutrient */
const LOW: Partial<Record<NutrientKey, Suggestion>> = {
  iron: { noun: "Iron", ideas: "Lentil curry or a spinach steak salad", query: "spinach" },
  fiber: { noun: "Fiber", ideas: "Black bean chili or a lentil soup", query: "lentils" },
  vitaminA: { noun: "Vitamin A", ideas: "Sweet potato curry or a carrot ginger soup", query: "sweet potato" },
  calcium: { noun: "Calcium", ideas: "Spinach feta pasta or a tofu stir fry", query: "tofu" },
  vitaminC: { noun: "Vitamin C", ideas: "A pepper stir fry or broccoli chicken", query: "broccoli" },
  vitaminD: { noun: "Vitamin D", ideas: "Lemon garlic salmon or a mushroom frittata", query: "salmon" },
  potassium: { noun: "Potassium", ideas: "A white bean stew or loaded baked potatoes", query: "beans" },
  protein: { noun: "Protein", ideas: "Chicken fajitas or a lentil bolognese", query: "chicken" },
  carbs: { noun: "Carbs", plural: true, ideas: "A chicken rice bowl or a pasta bake", query: "pasta" },
  fat: { noun: "Healthy fats", plural: true, ideas: "Salmon with avocado salsa or a pesto pasta", query: "avocado" },
};

/** Lighter dinners when a limit runs over */
const OVER: Partial<Record<NutrientKey, Suggestion>> = {
  sodium: { noun: "Sodium", ideas: "Herb roast chicken or a fresh grain bowl", query: "grain bowl" },
  sugar: { noun: "Sugar", ideas: "A veggie omelette or a salmon salad", query: "salad" },
  saturatedFat: { noun: "Saturated fat", ideas: "A fish taco bowl or a chicken stir fry", query: "stir fry" },
  cholesterol: { noun: "Cholesterol", ideas: "A chickpea curry or bean burritos", query: "chickpea" },
};

/** "Iron’s been low this week" / "Iron was low that week" (an earlier week reads in the past) */
function wasLow(s: Suggestion, how: string, period: string): string {
  if (period === "this week") return `${s.noun}${s.plural ? " have" : "’s"} been ${how} ${period}.`;
  return `${s.noun} ${s.plural ? "were" : "was"} ${how} ${period}.`;
}

/** `period`: "this week" for the last 7 days, "that week" for an earlier one */
export function nutrientInsight(rows: NutrientRow[], period = "this week"): NutrientInsight {
  const low = rows
    .filter((r) => r.def.kind === "goal" && r.def.key !== "calories" && (r.status === "low" || r.status === "a-bit-low") && LOW[r.def.key])
    .sort((a, b) => a.ratio - b.ratio)[0];
  if (low) {
    const s = LOW[low.def.key] as Suggestion;
    const how = low.status === "low" ? "low" : "a bit low";
    const it = s.plural ? "them" : "it";
    return {
      key: low.def.key,
      text: `${wasLow(s, how, period)} Want a couple of dinners with more of ${it}? ${s.ideas} would do it.`,
      query: s.query,
    };
  }
  const over = rows.filter((r) => r.def.kind === "limit" && r.status === "over" && OVER[r.def.key]).sort((a, b) => b.ratio - a.ratio)[0];
  if (over) {
    const s = OVER[over.def.key] as Suggestion;
    return {
      key: over.def.key,
      text: `${s.noun} ran high ${period}. Want a couple of dinners with less of it? ${s.ideas} would do it.`,
      query: s.query,
    };
  }
  return { key: null, text: `You hit your nutrient targets ${period}. Want a few more dinners like these?`, query: null };
}
