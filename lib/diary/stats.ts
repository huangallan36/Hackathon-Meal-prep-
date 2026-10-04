/**
 * Pure helpers for the Diary tab: day totals for every tracked nutrient (with estimates
 * for entries that carry no data for some of them), weekly averages, nutrient status rows,
 * streaks, calendar grids and display formatting.
 */
import { heuristicMicros, type FullMicros } from "@/lib/diary/micros";
import { emptyTotals, MICRO_KEYS, NUTRIENTS, nutrientStatus, type NutrientDef, type NutrientStatus, type NutrientTotals } from "@/lib/nutrients";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import type { DiaryEntry, ISODate, MealType, Nutrition, NutritionGoals } from "@/lib/types";
import { addDays, formatDay, fromISODate, toISODate } from "@/lib/utils";

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Every registry nutrient (calories, macros, vitamins, minerals, limits) */
export type DayTotals = NutrientTotals;

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
  return goal > 0 && Number.isFinite(value) ? Math.max(0, value) / goal : 0;
}

/** Whole percentages of the total that always add up to 100 (largest remainder) */
export function splitPercents(values: number[]): number[] {
  const safe = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) return safe.map(() => 0);
  const raw = safe.map((v) => (v / total) * 100);
  const out = raw.map(Math.floor);
  let short = 100 - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) {
    if (short <= 0) break;
    out[i]++;
    short--;
  }
  return out;
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

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Every micronutrient for one entry. Whatever the entry doesn't carry (older photo logs,
 * partial estimates) comes from the cooked recipe's per-serving values scaled to the logged
 * calories, else from an average-diet density for those calories. `estimated` is true
 * when any value had to be filled in like that.
 */
export function microsFor(e: DiaryEntry): { micros: FullMicros; estimated: boolean } {
  const have = e.micros ?? {};
  const out = {} as FullMicros;
  const missing: (keyof FullMicros)[] = [];
  for (const k of MICRO_KEYS) {
    const v = have[k];
    if (finite(v)) out[k] = Math.max(0, v);
    else missing.push(k);
  }
  if (!missing.length) return { micros: out, estimated: false };

  const kcal = Math.max(0, e.nutrition.calories || 0);
  const r = e.recipeId != null ? getCachedRecipe(e.recipeId)?.nutrition : undefined;
  const scale = r && r.calories > 0 && kcal > 0 ? Math.min(2, Math.max(0.5, kcal / r.calories)) : 1;
  const typical = heuristicMicros({ calories: kcal, carbs: e.nutrition.carbs || 0, fat: e.nutrition.fat || 0 });
  for (const k of missing) {
    const fromRecipe = r?.[k];
    out[k] = finite(fromRecipe) ? Math.max(0, fromRecipe) * scale : typical[k];
  }
  return { micros: out, estimated: true };
}

export interface TotalsResult {
  totals: NutrientTotals;
  /** Some micros were filled in from recipes or calories (entries without that data) */
  microsEstimated: boolean;
  /** Some entries are Sous estimates (photo, voice or typed descriptions) */
  aiEstimated: boolean;
  count: number;
}

/** Every registry nutrient summed over `entries` */
export function sumNutrients(entries: DiaryEntry[]): TotalsResult {
  const totals = emptyTotals();
  let microsEstimated = false;
  let aiEstimated = false;
  for (const e of entries) {
    totals.calories += e.nutrition.calories || 0;
    totals.protein += e.nutrition.protein || 0;
    totals.carbs += e.nutrition.carbs || 0;
    totals.fat += e.nutrition.fat || 0;
    totals.fiber += e.nutrition.fiber || 0;
    const m = microsFor(e);
    for (const k of MICRO_KEYS) totals[k] += m.micros[k];
    microsEstimated ||= m.estimated;
    aiEstimated ||= e.estimated === true;
  }
  return { totals, microsEstimated, aiEstimated, count: entries.length };
}

/** Everything the Diary needs for one day */
export function dayTotals(entries: DiaryEntry[], date: ISODate): TotalsResult {
  return sumNutrients(entries.filter((e) => e.date === date));
}

/** Dates with at least one entry in the `days`-day window ending on `endDate` (inclusive), oldest first */
export function loggedDaysIn(entries: DiaryEntry[], endDate: ISODate, days = 7): ISODate[] {
  const start = addDays(endDate, -(Math.max(1, Math.floor(days)) - 1));
  const set = new Set<ISODate>();
  for (const e of entries) if (e.date >= start && e.date <= endDate) set.add(e.date);
  return [...set].sort();
}

/**
 * Daily average of every nutrient over the `days`-day window ending on `endDate`, counting
 * only days that have entries (a skipped day doesn't drag the average down). Pass yesterday
 * as `endDate` for "the last 7 full days" (today is still in progress). All zeros when
 * nothing was logged.
 */
export function weekAverages(entries: DiaryEntry[], endDate: ISODate, days = 7): NutrientTotals {
  return weekSummary(entries, endDate, days).averages;
}

export interface WeekSummary {
  /** Daily average of every nutrient over the logged days (all zeros when none) */
  averages: NutrientTotals;
  /** Logged dates in the window, oldest first */
  loggedDays: ISODate[];
  microsEstimated: boolean;
  aiEstimated: boolean;
}

/** weekAverages plus which days count and whether any of it is estimated */
export function weekSummary(entries: DiaryEntry[], endDate: ISODate, days = 7): WeekSummary {
  const loggedDays = loggedDaysIn(entries, endDate, days);
  const averages = emptyTotals();
  if (!loggedDays.length) return { averages, loggedDays, microsEstimated: false, aiEstimated: false };
  const inWindow = new Set(loggedDays);
  const { totals, microsEstimated, aiEstimated } = sumNutrients(entries.filter((e) => inWindow.has(e.date)));
  for (const n of NUTRIENTS) averages[n.key] = totals[n.key] / loggedDays.length;
  return { averages, loggedDays, microsEstimated, aiEstimated };
}

/** The `days` dates ending on `endDate`, oldest first */
export function daysEnding(endDate: ISODate, days = 7): ISODate[] {
  const n = Math.max(1, Math.floor(days));
  return Array.from({ length: n }, (_, i) => addDays(endDate, i - (n - 1)));
}

/* ------------------------------------------------------------------ */
/* Day status (Figma 3.4 calendar colors)                              */
/* ------------------------------------------------------------------ */

/**
 * on-target: within 10% of the calorie goal; over: more than 10% above it;
 * partial: fewer than 3 meals (breakfast, lunch, dinner) or under 90%; none: nothing logged.
 */
export type DayStatus = "on-target" | "over" | "partial" | "none";

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  "on-target": "on target",
  over: "over",
  partial: "partial",
  none: "nothing logged",
};

export interface DayInfo {
  date: ISODate;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Distinct main meals logged (breakfast, lunch, dinner) */
  meals: number;
  entries: number;
  status: DayStatus;
}

/** `entries` = how many foods were logged that day (0 = nothing logged) */
export function dayStatus(kcal: number, meals: number, entries: number, goal: number): DayStatus {
  if (entries <= 0) return "none";
  const r = ratio(kcal, goal);
  if (goal > 0 && r > 1.1) return "over";
  if (meals < 3 || r < 0.9) return "partial";
  return "on-target";
}

/** Status and totals for every logged date, one pass */
export function dayInfos(entries: DiaryEntry[], goal: number): Map<ISODate, DayInfo> {
  const acc = new Map<ISODate, { kcal: number; protein: number; carbs: number; fat: number; slots: Set<MealType>; entries: number }>();
  for (const e of entries) {
    let a = acc.get(e.date);
    if (!a) acc.set(e.date, (a = { kcal: 0, protein: 0, carbs: 0, fat: 0, slots: new Set(), entries: 0 }));
    a.kcal += e.nutrition.calories || 0;
    a.protein += e.nutrition.protein || 0;
    a.carbs += e.nutrition.carbs || 0;
    a.fat += e.nutrition.fat || 0;
    if (e.meal !== "snack") a.slots.add(e.meal);
    a.entries++;
  }
  const out = new Map<ISODate, DayInfo>();
  for (const [date, a] of acc) {
    const meals = a.slots.size;
    const status = dayStatus(a.kcal, meals, a.entries, goal);
    out.set(date, { date, kcal: a.kcal, protein: a.protein, carbs: a.carbs, fat: a.fat, meals, entries: a.entries, status });
  }
  return out;
}

export function emptyDayInfo(date: ISODate): DayInfo {
  return { date, kcal: 0, protein: 0, carbs: 0, fat: 0, meals: 0, entries: 0, status: "none" };
}

/* ------------------------------------------------------------------ */
/* Targets + status                                                    */
/* ------------------------------------------------------------------ */

/** The user's goal for a nutrient when they have one, else the registry's daily value */
export function targetFor(def: NutrientDef, goals?: Partial<NutritionGoals>): number {
  const g = goals?.[def.key as keyof NutritionGoals];
  return finite(g) && g > 0 ? g : def.target;
}

export interface NutrientRow {
  def: NutrientDef;
  value: number;
  target: number;
  /** value / target (1 = 100%) */
  ratio: number;
  status: NutrientStatus;
}

export function nutrientRow(def: NutrientDef, totals: NutrientTotals, goals?: Partial<NutritionGoals>): NutrientRow {
  const value = Math.max(0, finite(totals[def.key]) ? totals[def.key] : 0);
  const target = targetFor(def, goals);
  return { def, value, target, ratio: ratio(value, target), status: nutrientStatus({ ...def, target }, value) };
}

/** Rows for the given registry groups, in registry order */
export function nutrientRows(totals: NutrientTotals, goals: Partial<NutritionGoals> | undefined, groups: NutrientDef["group"][]): NutrientRow[] {
  return NUTRIENTS.filter((n) => groups.includes(n.group)).map((n) => nutrientRow(n, totals, goals));
}

/**
 * The 4-6 rows worth a glance: the goals furthest from their target (fiber, vitamins,
 * minerals), then any limit that's over. Lowest first, like Figma's "Highlighted nutrients".
 */
export function highlightedNutrients(totals: NutrientTotals, goals?: Partial<NutritionGoals>): NutrientRow[] {
  const over = NUTRIENTS.filter((n) => n.kind === "limit")
    .map((n) => nutrientRow(n, totals, goals))
    .filter((r) => r.status === "over")
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 2);
  const lows = NUTRIENTS.filter((n) => n.kind === "goal" && (n.key === "fiber" || n.group === "vitamin" || n.group === "mineral"))
    .map((n) => nutrientRow(n, totals, goals))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, over.length ? 4 : 5);
  return [...lows, ...over];
}

/** Figma 3.2's rows, in its order; the rest of the registry follows */
export const FEATURED_NUTRIENTS: NutrientDef["key"][] = ["iron", "fiber", "vitaminA", "calcium", "vitaminC", "sodium"];

/** Every nutrient but calories as rows: Figma 3.2's six first, then registry order */
export function weeklyNutrientRows(totals: NutrientTotals, goals?: Partial<NutritionGoals>): NutrientRow[] {
  const featured = FEATURED_NUTRIENTS.map((k) => NUTRIENTS.find((n) => n.key === k)).filter((n): n is NutrientDef => !!n);
  const rest = NUTRIENTS.filter((n) => n.key !== "calories" && !FEATURED_NUTRIENTS.includes(n.key));
  return [...featured, ...rest].map((n) => nutrientRow(n, totals, goals));
}

/** Calories per logged date, one pass */
export function kcalByDate(entries: DiaryEntry[]): Record<ISODate, number> {
  const out: Record<ISODate, number> = {};
  for (const e of entries) out[e.date] = (out[e.date] ?? 0) + (e.nutrition.calories || 0);
  return out;
}

/**
 * Average kcal per logged day of a week. Today is still in progress, so it only counts
 * when it is the only logged day (otherwise a half-eaten today drags the average down).
 */
export function weekAverage(days: ISODate[], kcalByDay: Record<ISODate, number>, today: ISODate): { avg: number; days: number } {
  const logged = days.filter((d) => d <= today && (kcalByDay[d] ?? 0) > 0);
  const complete = logged.filter((d) => d !== today);
  const use = complete.length ? complete : logged;
  if (!use.length) return { avg: 0, days: 0 };
  return { avg: use.reduce((a, d) => a + (kcalByDay[d] ?? 0), 0) / use.length, days: use.length };
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

/** Consecutive logged days ending on `date` (0 when `date` itself has nothing logged) */
export function streakEndingOn(logged: Set<ISODate>, date: ISODate): number {
  let n = 0;
  let day = date;
  while (logged.has(day) && n < 3660) {
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

/** "Saturday, October 3" (with the year when it isn't this year) */
export function fullDayLabel(iso: ISODate, today: ISODate): string {
  const sameYear = iso.slice(0, 4) === today.slice(0, 4);
  return formatDay(iso, { weekday: "long", month: "long", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

/** Daily diary heading: "Today", "Yesterday", else the weekday ("Thursday") */
export function dayHeading(iso: ISODate, today: ISODate): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  return formatDay(iso, { weekday: "long" });
}

/** "S", "M", ... (Sunday-start, like Figma's calendars) */
export const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/** Initial of the weekday `iso` falls on */
export function weekdayInitial(iso: ISODate): string {
  return WEEKDAY_INITIALS[fromISODate(iso).getDay()];
}

/**
 * The daily diary's week strip: the Sunday-Saturday week holding `selected`, except the
 * current week, which is the 7 days ending today (so the strip never shows future days).
 */
export function stripDays(selected: ISODate, today: ISODate): ISODate[] {
  const saturday = addDays(selected, 6 - fromISODate(selected).getDay());
  return daysEnding(saturday < today ? saturday : today);
}

/** "7h 10m" */
export function formatHours(hours: number): string {
  const mins = Math.max(0, Math.round((Number.isFinite(hours) ? hours : 0) * 60));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

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

/** Sunday-start grid for a month in whole weeks, padded with neighbouring-month days */
export function monthGrid({ year, month }: MonthRef): CalendarCell[] {
  const lead = new Date(year, month, 1).getDay();
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
