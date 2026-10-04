/**
 * Every nutrient Sous tracks: label, unit, daily target and whether it's a goal to reach
 * or a limit to stay under. One registry drives the diary breakdown, weekly averages,
 * status badges and the Gemini estimate schemas. Pure data + helpers, client and server safe.
 */
import { DEFAULT_GOALS } from "@/lib/config";
import type { Micros, Nutrition } from "@/lib/types";

export type NutrientKey = keyof Nutrition | keyof Micros;

/** Totals for a day (or a weekly average): every nutrient, 0 when nothing was logged */
export type NutrientTotals = Record<NutrientKey, number>;

export type NutrientUnit = "kcal" | "g" | "mg" | "µg";

export interface NutrientDef {
  key: NutrientKey;
  label: string;
  unit: NutrientUnit;
  /** Daily target (goal) or ceiling (limit) */
  target: number;
  /** goal: aim to reach it; limit: stay under it */
  kind: "goal" | "limit";
  group: "energy" | "macro" | "vitamin" | "mineral" | "limit";
}

/** Display order = order here. Targets: the user's goals for energy/macros, FDA daily values for the rest. */
export const NUTRIENTS: NutrientDef[] = [
  { key: "calories", label: "Calories", unit: "kcal", target: DEFAULT_GOALS.calories, kind: "goal", group: "energy" },
  { key: "protein", label: "Protein", unit: "g", target: DEFAULT_GOALS.protein, kind: "goal", group: "macro" },
  { key: "carbs", label: "Carbs", unit: "g", target: DEFAULT_GOALS.carbs, kind: "goal", group: "macro" },
  { key: "fat", label: "Fat", unit: "g", target: DEFAULT_GOALS.fat, kind: "goal", group: "macro" },
  { key: "fiber", label: "Fiber", unit: "g", target: DEFAULT_GOALS.fiber, kind: "goal", group: "macro" },
  { key: "iron", label: "Iron", unit: "mg", target: DEFAULT_GOALS.iron, kind: "goal", group: "mineral" },
  { key: "calcium", label: "Calcium", unit: "mg", target: DEFAULT_GOALS.calcium, kind: "goal", group: "mineral" },
  { key: "potassium", label: "Potassium", unit: "mg", target: 4700, kind: "goal", group: "mineral" },
  { key: "vitaminA", label: "Vitamin A", unit: "µg", target: DEFAULT_GOALS.vitaminA, kind: "goal", group: "vitamin" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", target: DEFAULT_GOALS.vitaminC, kind: "goal", group: "vitamin" },
  { key: "vitaminD", label: "Vitamin D", unit: "µg", target: 20, kind: "goal", group: "vitamin" },
  { key: "sodium", label: "Sodium", unit: "mg", target: DEFAULT_GOALS.sodium, kind: "limit", group: "limit" },
  { key: "sugar", label: "Sugar", unit: "g", target: 50, kind: "limit", group: "limit" },
  { key: "saturatedFat", label: "Saturated fat", unit: "g", target: 20, kind: "limit", group: "limit" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", target: 300, kind: "limit", group: "limit" },
];

export const NUTRIENT_BY_KEY = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n])) as Record<NutrientKey, NutrientDef>;

/** Keys stored in DiaryEntry.micros (everything except the core five in Nutrition) */
export const MICRO_KEYS = NUTRIENTS.map((n) => n.key).filter(
  (k): k is keyof Micros => !["calories", "protein", "carbs", "fat", "fiber"].includes(k),
);

export function emptyTotals(): NutrientTotals {
  return Object.fromEntries(NUTRIENTS.map((n) => [n.key, 0])) as NutrientTotals;
}

/**
 * Figma 3.2 status for a nutrient at `value` against its target.
 * Goals: under 60% "low", under 90% "a bit low", otherwise "on track" (calories over 110% = "over").
 * Limits: up to 100% "on track", above = "over".
 */
export type NutrientStatus = "low" | "a-bit-low" | "on-track" | "over";

export function nutrientStatus(def: NutrientDef, value: number): NutrientStatus {
  const pct = def.target > 0 ? value / def.target : 0;
  if (def.kind === "limit") return pct > 1 ? "over" : "on-track";
  if (def.key === "calories" && pct > 1.1) return "over";
  if (pct < 0.6) return "low";
  if (pct < 0.9) return "a-bit-low";
  return "on-track";
}

export const STATUS_LABEL: Record<NutrientStatus, string> = {
  low: "Low",
  "a-bit-low": "A bit low",
  "on-track": "On track",
  over: "Over",
};

/** "1,050 mg", "22 g", "640 µg" (whole numbers; anything but kcal under 10 keeps one decimal) */
export function formatAmount(value: number, unit: NutrientUnit): string {
  const v = unit !== "kcal" && value > 0 && value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${v.toLocaleString("en-US")} ${unit}`;
}
