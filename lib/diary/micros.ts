/**
 * Micronutrient math shared by every logging path (voice, typed, photo, seed) and the
 * Diary totals: clamping model output, scaling a portion, rounding for display and the
 * calorie-based estimate used when an entry carries no data for a nutrient.
 * Pure (no browser or server APIs), safe on client and server.
 */
import { MICRO_KEYS, NUTRIENT_BY_KEY } from "@/lib/nutrients";
import type { Micros, Nutrition } from "@/lib/types";

export type MicroKey = keyof Micros;

/** Full set of micros (every key present) */
export type FullMicros = Record<MicroKey, number>;

/**
 * Upper bounds for ONE food item or plate. Anything above is a model or parsing error
 * (a day's totals are sums, so they are not capped).
 */
export const MICRO_MAX: FullMicros = {
  iron: 45,
  calcium: 2500,
  potassium: 5000,
  vitaminA: 5000,
  vitaminC: 600,
  vitaminD: 60,
  sodium: 6000,
  sugar: 200,
  saturatedFat: 100,
  cholesterol: 1500,
};

/** Display/storage rounding: grams to 0.1, mg/µg to whole numbers (0.1 under 10) */
export function roundMicro(key: MicroKey, value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const unit = NUTRIENT_BY_KEY[key]?.unit;
  if (unit === "g" || value < 10) return Math.round(value * 10) / 10;
  return Math.round(value);
}

function toNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && /\d/.test(v) ? Number.parseFloat(v.replace(/[^\d.]/g, "")) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Untrusted micros (model JSON, localStorage, recipe data) -> finite, clamped, rounded
 * values for the keys that are actually present. Missing keys stay missing, so callers
 * can tell "zero" from "unknown".
 */
export function clampMicros(raw: unknown, max: Partial<FullMicros> | null = MICRO_MAX): Partial<Micros> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<Micros> = {};
  for (const k of MICRO_KEYS) {
    if (r[k] == null || r[k] === "") continue;
    const n = toNumber(r[k]);
    if (n == null) continue;
    const cap = max?.[k];
    out[k] = roundMicro(k, cap != null ? Math.min(cap, n) : n);
  }
  return out;
}

/** Multiply every present micro by `factor` (rounded) */
export function scaleMicros(m: Partial<Micros> | undefined, factor: number): Partial<Micros> {
  const out: Partial<Micros> = {};
  if (!m) return out;
  const f = Number.isFinite(factor) && factor > 0 ? factor : 0;
  for (const k of MICRO_KEYS) {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = roundMicro(k, v * f);
  }
  return out;
}

/** True when every registry micro is present */
export function hasAllMicros(m: Partial<Micros> | undefined): m is Micros & FullMicros {
  return !!m && MICRO_KEYS.every((k) => typeof m[k] === "number" && Number.isFinite(m[k]));
}

/**
 * Rough micros of a typical mixed diet for a food with these macros, used when nothing
 * better is known (generic plates, entries without data). Per 2,000 kcal that is about
 * 15 mg iron, 800 mg calcium, 2,600 mg potassium, 600 µg vitamin A, 70 mg vitamin C,
 * 4 µg vitamin D, 3,200 mg sodium and 280 mg cholesterol; sugar and saturated fat follow
 * the carbs and fat.
 */
export function heuristicMicros(n: Pick<Nutrition, "calories" | "carbs" | "fat">): FullMicros {
  const kcal = Number.isFinite(n.calories) && n.calories > 0 ? n.calories : 0;
  const carbs = Number.isFinite(n.carbs) && n.carbs > 0 ? n.carbs : kcal * 0.12;
  const fat = Number.isFinite(n.fat) && n.fat > 0 ? n.fat : kcal * 0.035;
  const raw: FullMicros = {
    iron: kcal * 0.0075,
    calcium: kcal * 0.4,
    potassium: kcal * 1.3,
    vitaminA: kcal * 0.3,
    vitaminC: kcal * 0.035,
    vitaminD: kcal * 0.002,
    sodium: kcal * 1.6,
    sugar: carbs * 0.25,
    saturatedFat: fat * 0.33,
    cholesterol: kcal * 0.14,
  };
  const out = {} as FullMicros;
  for (const k of MICRO_KEYS) out[k] = roundMicro(k, raw[k]);
  return out;
}

/** `m` with every missing key filled from `fill` (both rounded) */
export function completeMicros(m: Partial<Micros> | undefined, fill: FullMicros): FullMicros {
  const out = {} as FullMicros;
  for (const k of MICRO_KEYS) {
    const v = m?.[k];
    out[k] = typeof v === "number" && Number.isFinite(v) ? v : fill[k];
  }
  return out;
}
