/**
 * Guards for data entering the diary store: entries logged by other features (photo
 * estimates can arrive with blanks, strings or NaN) and whatever was persisted in
 * localStorage. Everything that reaches the UI is a finite, non-negative number.
 */
import { DEFAULT_GOALS } from "@/lib/config";
import { MICRO_KEYS } from "@/lib/nutrients";
import type { DailyActivity, DiaryEntry, ISODate, MealType, Micros, Nutrition, NutritionGoals } from "@/lib/types";
import { fromISODate, mealForNow, toISODate, todayISO } from "@/lib/utils";

const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const SOURCES: readonly DiaryEntry["source"][] = ["seed", "ai", "manual"];

type Loose = Record<string, unknown>;
const isObject = (v: unknown): v is Loose => typeof v === "object" && v !== null && !Array.isArray(v);

/** Finite, non-negative number (numeric strings accepted), else 0 */
export function num(v: unknown, decimals = 1): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : Number.NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function isISODate(v: unknown): v is ISODate {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && toISODate(fromISODate(v)) === v;
}

export function cleanNutrition(v: unknown): Nutrition {
  const n = isObject(v) ? v : {};
  return {
    calories: num(n.calories, 0),
    protein: num(n.protein),
    carbs: num(n.carbs),
    fat: num(n.fat),
    fiber: num(n.fiber),
  };
}

/**
 * Every registry micro that is present (vitamins, minerals, sugar, sodium...). Missing keys
 * stay missing so the Diary can tell "no data" (estimated later) from a real zero.
 * Values are capped well above any single plate so a corrupt entry can't wreck a day.
 */
const MICRO_CAP = 100_000;

function cleanMicros(v: unknown): Partial<Micros> | undefined {
  if (!isObject(v)) return undefined;
  const out: Partial<Micros> = {};
  for (const k of MICRO_KEYS) {
    if (v[k] != null && v[k] !== "") out[k] = Math.min(MICRO_CAP, num(v[k]));
  }
  return Object.keys(out).length ? out : undefined;
}

function text(v: unknown, fallback: string, max = 120): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : fallback;
}

/** Normalizes the fields a caller passes to addEntry / updateEntry (only the keys present) */
export function cleanEntryFields(e: Partial<DiaryEntry>): Partial<DiaryEntry> {
  const out: Partial<DiaryEntry> = { ...e };
  if ("date" in e) out.date = isISODate(e.date) ? e.date : todayISO();
  if ("meal" in e) out.meal = MEALS.includes(e.meal as MealType) ? e.meal : mealForNow();
  if ("name" in e) out.name = text(e.name, "Meal");
  if ("portion" in e) out.portion = text(e.portion, "1 serving", 60);
  if ("nutrition" in e) out.nutrition = cleanNutrition(e.nutrition);
  if ("micros" in e) out.micros = cleanMicros(e.micros);
  if ("source" in e && !SOURCES.includes(e.source as DiaryEntry["source"])) out.source = "manual";
  if ("image" in e && typeof e.image !== "string") out.image = undefined;
  if ("recipeId" in e && !(typeof e.recipeId === "number" && Number.isFinite(e.recipeId))) out.recipeId = undefined;
  return out;
}

/** A persisted entry we can still render, normalized; null when it is beyond repair */
export function reviveEntry(v: unknown): DiaryEntry | null {
  if (!isObject(v) || typeof v.id !== "string" || !v.id || !isISODate(v.date) || !isObject(v.nutrition)) return null;
  const loggedAt = typeof v.loggedAt === "number" && Number.isFinite(v.loggedAt) ? v.loggedAt : fromISODate(v.date).getTime() + 12 * 3_600_000;
  const fields: Partial<DiaryEntry> = {
    date: v.date,
    meal: v.meal as MealType,
    name: v.name as string,
    portion: v.portion as string,
    nutrition: v.nutrition as unknown as Nutrition,
    source: v.source as DiaryEntry["source"],
  };
  // Optional fields only when present, so revived entries keep their original shape
  if ("micros" in v) fields.micros = v.micros as Partial<Micros>;
  if ("image" in v) fields.image = v.image as string;
  if ("recipeId" in v) fields.recipeId = v.recipeId as number;
  const entry = { ...cleanEntryFields(fields), id: v.id, loggedAt } as DiaryEntry;
  if (v.estimated === true) entry.estimated = true;
  return entry;
}

export function reviveEntries(v: unknown): DiaryEntry[] {
  if (!Array.isArray(v)) return [];
  const out: DiaryEntry[] = [];
  for (const raw of v) {
    const e = reviveEntry(raw);
    if (e) out.push(e);
  }
  return out;
}

export function reviveActivity(v: unknown): Record<ISODate, DailyActivity> | null {
  if (!isObject(v)) return null;
  const out: Record<ISODate, DailyActivity> = {};
  for (const [date, a] of Object.entries(v)) {
    if (!isISODate(date) || !isObject(a)) continue;
    out[date] = { steps: num(a.steps, 0), exerciseKcal: num(a.exerciseKcal, 0), exerciseMinutes: num(a.exerciseMinutes, 0), sleepHours: num(a.sleepHours) };
  }
  return out;
}

/** Persisted goals over the defaults; anything missing or non-positive keeps the default */
export function reviveGoals(v: unknown): NutritionGoals {
  const goals: NutritionGoals = { ...DEFAULT_GOALS };
  if (!isObject(v)) return goals;
  for (const k of Object.keys(goals) as (keyof NutritionGoals)[]) {
    const n = num(v[k]);
    if (n > 0) goals[k] = n;
  }
  return goals;
}
