/**
 * Editable form state for the "Estimated" meal card. Numbers are kept as strings while
 * editing (so a field can be empty mid-typing) and parsed + clamped on save.
 */
import type { MealEstimate, Nutrition } from "@/lib/types";
import { kcalFromMacros, MEAL_LIMITS } from "./meal";

export interface EstimateDraft {
  dishName: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  /** Calories and macro energy at the last explicit calorie value; macro edits move calories from here */
  anchor: { calories: number; macroKcal: number };
}

export type NumberKey = keyof Nutrition;

const fmt = (n: number) => String(Math.round(n * 10) / 10);

export function toDraft(e: MealEstimate): EstimateDraft {
  return {
    dishName: e.dishName,
    portion: e.portion,
    calories: String(Math.round(e.calories)),
    protein: fmt(e.protein),
    carbs: fmt(e.carbs),
    fat: fmt(e.fat),
    fiber: fmt(e.fiber),
    anchor: { calories: Math.round(e.calories), macroKcal: kcalFromMacros(e) },
  };
}

/** Keep only digits and one decimal point (integers for calories) */
export function cleanNumberInput(raw: string, integer = false): string {
  let s = raw.replace(/,/g, ".").replace(integer ? /[^\d]/g : /[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 1);
  return s.replace(/^0+(?=\d)/, "").slice(0, 6);
}

function parse(value: string, max: number, integer: boolean): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const clamped = Math.min(max, n);
  return integer ? Math.round(clamped) : Math.round(clamped * 10) / 10;
}

export function draftNutrition(d: EstimateDraft): Nutrition {
  return {
    calories: parse(d.calories, MEAL_LIMITS.calories, true),
    protein: parse(d.protein, MEAL_LIMITS.protein, false),
    carbs: parse(d.carbs, MEAL_LIMITS.carbs, false),
    fat: parse(d.fat, MEAL_LIMITS.fat, false),
    fiber: parse(d.fiber, MEAL_LIMITS.fiber, false),
  };
}

/**
 * Apply an edit. Changing protein, carbs or fat shifts calories by the energy difference
 * (4/4/9 kcal per gram) so the card stays consistent; typing calories sets a new anchor.
 */
export function patchDraft(d: EstimateDraft, patch: Partial<Omit<EstimateDraft, "anchor">>): EstimateDraft {
  const next: EstimateDraft = { ...d, ...patch };
  if (patch.calories !== undefined) {
    const n = draftNutrition(next);
    return { ...next, anchor: { calories: n.calories, macroKcal: kcalFromMacros(n) } };
  }
  if (patch.protein !== undefined || patch.carbs !== undefined || patch.fat !== undefined) {
    const kcal = d.anchor.calories + kcalFromMacros(draftNutrition(next)) - d.anchor.macroKcal;
    next.calories = String(Math.round(Math.min(MEAL_LIMITS.calories, Math.max(0, kcal))));
  }
  return next;
}
