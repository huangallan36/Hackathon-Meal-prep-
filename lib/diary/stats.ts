/**
 * Pure helpers for the Diary tab: day totals (with micronutrient estimates for
 * photo-logged meals), streaks, calendar grids and display formatting.
 */
import { getCachedRecipe } from "@/lib/recipes/catalog";
import type { DiaryEntry, ISODate, MealType, Micros, Nutrition } from "@/lib/types";
import { addDays, formatDay, fromISODate, toISODate } from "@/lib/utils";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export type DayTotals = Nutrition & Micros;

const ZERO: DayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 0, vitaminA: 0 };

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

/** "1,240" (rounded); `decimals` for things like iron (12.4 mg) */
export function fmt(n: number, decimals = 0): string {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** value / goal as 0..∞ (0 when the goal is missing) */
export function ratio(value: number, goal: number): number {
  return goal > 0 ? Math.max(0, value) / goal : 0;
}

/* ------------------------------------------------------------------ */
/* Totals                                                              */
/* ------------------------------------------------------------------ */

export function sumNutrition(entries: DiaryEntry[]): Nutrition {
  const t: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const e of entries) {
    t.calories += e.nutrition.calories || 0;
    t.protein += e.nutrition.protein || 0;
    t.carbs += e.nutrition.carbs || 0;
    t.fat += e.nutrition.fat || 0;
    t.fiber += e.nutrition.fiber || 0;
  }
  return t;
}

const hasMicros = (m?: Partial<Micros>) => !!m && (m.iron != null || m.calcium != null || m.vitaminA != null);

/**
 * Micronutrients for one entry. Photo estimates from Gemini only carry macros, so we
 * fall back to the cooked recipe's per-serving micros (scaled to the logged calories),
 * then to an average-diet density per kcal. Either fallback is flagged as estimated.
 */
export function microsFor(e: DiaryEntry): { micros: Micros; estimated: boolean } {
  if (hasMicros(e.micros)) {
    return { micros: { iron: e.micros?.iron ?? 0, calcium: e.micros?.calcium ?? 0, vitaminA: e.micros?.vitaminA ?? 0 }, estimated: false };
  }
  const kcal = Math.max(0, e.nutrition.calories || 0);
  const r = e.recipeId != null ? getCachedRecipe(e.recipeId)?.nutrition : undefined;
  if (r && hasMicros(r)) {
    const scale = r.calories > 0 && kcal > 0 ? Math.min(2, Math.max(0.5, kcal / r.calories)) : 1;
    return {
      micros: { iron: (r.iron ?? 0) * scale, calcium: (r.calcium ?? 0) * scale, vitaminA: (r.vitaminA ?? 0) * scale },
      estimated: true,
    };
  }
  // Rough densities of a typical mixed diet: ~15 mg iron, ~800 mg calcium, ~600 mcg vit A per 2,000 kcal
  return { micros: { iron: kcal * 0.0075, calcium: kcal * 0.4, vitaminA: kcal * 0.3 }, estimated: true };
}

/** Everything the Diary needs for one day */
export function dayTotals(entries: DiaryEntry[], date: ISODate): { totals: DayTotals; microsEstimated: boolean; count: number } {
  const totals = { ...ZERO };
  let microsEstimated = false;
  let count = 0;
  for (const e of entries) {
    if (e.date !== date) continue;
    count++;
    totals.calories += e.nutrition.calories || 0;
    totals.protein += e.nutrition.protein || 0;
    totals.carbs += e.nutrition.carbs || 0;
    totals.fat += e.nutrition.fat || 0;
    totals.fiber += e.nutrition.fiber || 0;
    const m = microsFor(e);
    totals.iron += m.micros.iron;
    totals.calcium += m.micros.calcium;
    totals.vitaminA += m.micros.vitaminA;
    microsEstimated ||= m.estimated;
  }
  return { totals, microsEstimated, count };
}

/** Entries of one day grouped by meal slot, each slot sorted by time */
export function groupByMeal(entries: DiaryEntry[], date: ISODate): Record<MealType, DiaryEntry[]> {
  const out: Record<MealType, DiaryEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const e of entries) if (e.date === date) (out[e.meal] ?? out.snack).push(e);
  for (const m of MEAL_ORDER) out[m].sort((a, b) => a.loggedAt - b.loggedAt);
  return out;
}

/* ------------------------------------------------------------------ */
/* Streaks                                                             */
/* ------------------------------------------------------------------ */

/** Consecutive logged days ending today, or yesterday if today is not logged yet */
export function currentStreak(logged: Set<ISODate>, today: ISODate): number {
  let day = logged.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(logged: Set<ISODate>): number {
  let best = 0;
  for (const d of logged) {
    if (logged.has(addDays(d, -1))) continue; // only start counting at the first day of a run
    let n = 0;
    let day = d;
    while (logged.has(day)) {
      n++;
      day = addDays(day, 1);
    }
    best = Math.max(best, n);
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Dates + calendar                                                    */
/* ------------------------------------------------------------------ */

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(fromISODate(s)) === s;
}

/** "Sep 28 – Oct 4" */
export function formatWeekRange(start: ISODate, end: ISODate): string {
  return `${formatDay(start)} – ${formatDay(end)}`;
}

/** "Thursday, Oct 2" */
export function longDayLabel(iso: ISODate): string {
  return formatDay(iso, { weekday: "long", month: "short", day: "numeric" });
}

/** "Today" / "Yesterday" / "Thursday, Oct 2" */
export function relativeDayLabel(iso: ISODate, today: ISODate): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return longDayLabel(iso);
}

/** "M", "T", ... (Mon-start) */
export const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export interface MonthRef {
  year: number;
  /** 0-based */
  month: number;
}

export function monthOf(iso: ISODate): MonthRef {
  const d = fromISODate(iso);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function compareMonths(a: MonthRef, b: MonthRef): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** "October 2026" */
export function monthLabel({ year, month }: MonthRef): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export interface CalendarCell {
  iso: ISODate;
  /** false for the neighbouring-month days that pad the first and last week */
  inMonth: boolean;
}

/** Mon-start grid for a month in whole weeks, padded with neighbouring-month days */
export function monthGrid({ year, month }: MonthRef): CalendarCell[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = i - lead + 1; // Date normalizes 0 / negatives / overflow into the neighbouring months
    return { iso: toISODate(new Date(year, month, d)), inMonth: d >= 1 && d <= days };
  });
}

/** Logged by the user (not seed) within the last `minutes` */
export function isFresh(e: DiaryEntry, minutes = 30): boolean {
  return e.source !== "seed" && Date.now() - e.loggedAt < minutes * 60_000;
}

/** "8:15 AM" */
export function timeLabel(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
