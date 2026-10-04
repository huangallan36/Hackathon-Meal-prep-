/**
 * Seeded diary: a believable recent history relative to *today*, so the demo always
 * looks current. Today has breakfast + lunch logged, leaving dinner for the live demo.
 *
 * Meals are picked from a hash of the calendar date (not the offset), so a given day
 * keeps the same meals as the demo rolls forward. Like Figma's diary calendar (3.4), most
 * past days land on target (within 10% of 2,200 kcal), about one a week runs over (treat
 * nights), and about one a week is only partly logged (no dinner), which pulls the weekly
 * average down to ~1,900 kcal (Figma 3.1 shows 1,840).
 *
 * Every meal carries the full nutrient set (lib/nutrients.ts). The values are tuned so the
 * last 7 full days average out like Figma's "Highlighted nutrients": iron low (~50%), fiber
 * and vitamin A a bit low (~73%, ~71%), calcium and vitamin C on track (~105%, ~109%),
 * sodium over (~126%); protein ~130 g, carbs ~195 g, fat ~64 g. Check with
 * `node .tmp/nutrients/seed-sim.mjs` and `node .tmp/diary/day-status-sim.mjs` after
 * changing anything here.
 */
import { roundMicro } from "@/lib/diary/micros";
import { MICRO_KEYS } from "@/lib/nutrients";
import type { DailyActivity, DiaryEntry, ISODate, MealType, Micros, Nutrition } from "@/lib/types";
import { addDays, fromISODate } from "@/lib/utils";

/** Bump when the seed changes shape so persisted stores regenerate it */
export const SEED_VERSION = 5;

type SeedMeal = { name: string; portion: string; n: Nutrition; m: Required<Micros> };

/**
 * n: [kcal, protein g, carbs g, fat g, fiber g]
 * m: [iron mg, calcium mg, potassium mg, vitamin A µg, vitamin C mg, vitamin D µg,
 *     sodium mg, sugar g, saturated fat g, cholesterol mg]
 */
const meal = (
  name: string,
  portion: string,
  [calories, protein, carbs, fat, fiber]: number[],
  [iron, calcium, potassium, vitaminA, vitaminC, vitaminD, sodium, sugar, saturatedFat, cholesterol]: number[],
): SeedMeal => ({
  name,
  portion,
  n: { calories, protein, carbs, fat, fiber },
  m: { iron, calcium, potassium, vitaminA, vitaminC, vitaminD, sodium, sugar, saturatedFat, cholesterol },
});

const POOL: Record<MealType, SeedMeal[]> = {
  breakfast: [
    meal("Greek yogurt, berries & granola", "1 bowl", [355, 28, 44, 8, 5], [1.1, 290, 420, 40, 20, 0.6, 95, 22, 2.5, 15]),
    meal("Avocado toast with a fried egg", "2 slices", [450, 22, 36, 24, 10], [2.4, 110, 720, 120, 12, 1.1, 520, 3, 5, 190]),
    meal("Oatmeal with banana & peanut butter", "1 bowl", [440, 26, 60, 12, 9], [2.2, 270, 720, 80, 10, 1.5, 180, 18, 3, 10]),
    meal("Veggie omelette", "3 eggs", [370, 31, 9, 22, 2], [2.6, 170, 480, 400, 45, 3.3, 520, 4, 7.5, 560]),
    meal("Spinach banana protein smoothie", "1 large glass", [330, 34, 40, 5, 6], [2.2, 420, 900, 280, 40, 2.5, 230, 24, 1, 15]),
    meal("Overnight oats with chia", "1 jar", [400, 28, 48, 10, 11], [2.4, 340, 450, 60, 3, 1.8, 110, 12, 1.5, 8]),
    meal("Breakfast burrito", "1 burrito", [560, 36, 48, 23, 6], [3.2, 260, 520, 240, 18, 1.6, 1050, 3, 9, 390]),
    meal("Cottage cheese, peach & honey", "1 bowl", [300, 30, 30, 5, 2], [0.4, 200, 330, 70, 8, 0.2, 700, 26, 2, 20]),
  ],
  lunch: [
    meal("Chicken burrito bowl", "1 bowl", [640, 48, 64, 17, 12], [3.4, 160, 1050, 160, 35, 1.2, 1250, 5, 5, 105]),
    meal("Turkey & swiss sandwich", "1 sandwich", [520, 42, 44, 18, 5], [2.6, 360, 560, 90, 6, 1.2, 1450, 6, 8, 75]),
    meal("Beef pho", "1 large bowl", [560, 42, 66, 10, 3], [3.6, 90, 760, 30, 12, 0.8, 1700, 6, 4, 70]),
    meal("Chicken caesar salad", "1 plate", [510, 48, 18, 26, 4], [2.1, 220, 640, 300, 18, 1.0, 1150, 3, 7, 110]),
    meal("Leftover tomato pasta", "1.5 cups", [610, 36, 78, 15, 7], [3.2, 180, 820, 120, 25, 0.6, 820, 11, 5, 40]),
    meal("Salmon sushi combo", "10 pieces", [550, 36, 76, 9, 3], [1.5, 60, 600, 110, 4, 9, 1100, 10, 2, 45]),
    meal("Lentil soup & sourdough", "1 bowl + 1 slice", [510, 32, 70, 8, 15], [4.8, 120, 980, 280, 18, 0.4, 1100, 7, 1.5, 0]),
    meal("Tuna poke bowl", "1 bowl", [600, 46, 68, 13, 6], [2.3, 80, 820, 180, 20, 4, 1250, 9, 2.5, 50]),
  ],
  dinner: [
    meal("Salmon with rice & greens", "1 plate", [640, 48, 54, 22, 5], [1.8, 110, 1150, 260, 35, 14, 520, 3, 4.5, 95]),
    meal("Spaghetti bolognese", "1 bowl", [690, 44, 78, 18, 7], [4, 170, 950, 130, 18, 0.8, 980, 12, 7.5, 75]),
    meal("Chicken veggie stir fry", "1 plate", [560, 52, 48, 14, 6], [2.5, 100, 1000, 400, 70, 0.9, 1150, 9, 3, 115]),
    meal("Chickpea tofu curry with rice", "1 bowl", [610, 34, 74, 17, 10], [4.4, 380, 880, 220, 22, 1.2, 900, 8, 8, 0]),
    meal("Teriyaki chicken & broccoli rice", "1 plate", [640, 54, 70, 11, 6], [2.3, 110, 900, 120, 80, 0.6, 1350, 14, 3, 125]),
    meal("Garlic shrimp linguine", "1 bowl", [650, 46, 74, 17, 5], [2.8, 170, 520, 140, 12, 1.2, 1050, 4, 6, 220]),
    meal("Sheet-pan sausage & veggies", "1 plate", [620, 38, 38, 32, 8], [2.5, 80, 1100, 520, 60, 1.0, 1300, 10, 11, 80]),
  ],
  snack: [
    meal("Apple & almond butter", "1 apple + 1 tbsp", [250, 7, 28, 14, 6], [0.9, 80, 390, 5, 8, 0, 5, 20, 1, 0]),
    meal("Protein bar", "1 bar", [210, 20, 22, 7, 5], [1.6, 150, 180, 0, 0, 2.0, 190, 6, 3, 5]),
    meal("Dark chocolate", "2 squares", [170, 2, 13, 12, 3], [2.9, 20, 180, 0, 0, 0, 5, 6, 7, 1]),
    meal("Hummus & veggie sticks", "1 snack box", [180, 6, 20, 9, 6], [1.2, 60, 420, 450, 30, 0, 320, 6, 1.2, 0]),
    meal("Iced latte", "1 medium", [190, 12, 18, 7, 0], [0.2, 400, 550, 140, 1, 2.9, 160, 17, 4.5, 30]),
    meal("Greek yogurt & honey", "1 cup", [180, 17, 18, 4, 0], [0.1, 200, 250, 30, 0, 0.4, 65, 17, 2.5, 15]),
    meal("Banana", "1 medium", [105, 1, 27, 0, 3], [0.3, 6, 422, 4, 10, 0, 1, 14, 0.1, 0]),
  ],
};

/** Friday/weekend dinners: the fun stuff */
const TREAT_DINNERS: SeedMeal[] = [
  meal("Homemade margherita pizza", "2 slices", [660, 34, 72, 24, 4], [3.4, 420, 520, 220, 14, 0.4, 1350, 8, 11, 55]),
  meal("Beef tacos", "3 tacos", [680, 44, 54, 30, 8], [4.2, 250, 780, 140, 12, 0.3, 1150, 4, 12, 105]),
  meal("Smash burger & side salad", "1 burger", [760, 48, 48, 38, 4], [4.6, 230, 800, 200, 14, 0.4, 1350, 10, 15, 120]),
  meal("Pad thai with chicken", "1 plate", [700, 44, 84, 20, 4], [3, 110, 600, 90, 10, 0.5, 1700, 20, 4, 170]),
];

/** Weekend evening extras: why a few days land over goal */
const TREAT_SNACKS: SeedMeal[] = [
  meal("Salted caramel ice cream", "1 scoop", [290, 5, 34, 15, 1], [0.2, 150, 250, 140, 0.5, 0.2, 160, 30, 9, 55]),
  meal("Chocolate chip cookies", "2 cookies", [260, 3, 36, 12, 1], [1.2, 20, 90, 40, 0, 0, 190, 22, 6, 20]),
  meal("Cheese & crackers", "1 small plate", [310, 14, 20, 20, 1], [0.9, 320, 110, 140, 0, 0.2, 520, 1, 10, 50]),
];

/** Today's entries are fixed so the live demo always starts from the same numbers */
const TODAY: Partial<Record<MealType, SeedMeal>> = {
  breakfast: POOL.breakfast[0],
  lunch: POOL.lunch[0],
};

/** Typical hour + minute jitter range for each slot */
const HOURS: Record<MealType, number> = { breakfast: 8, lunch: 12.5, dinner: 19, snack: 15.5 };
const SNACK_AFTER: Partial<Record<MealType, number>> = { breakfast: 10.5, lunch: 15.5, dinner: 21 };

/** How far back the history goes (days) */
const HISTORY_DAYS = 40;

/**
 * Days (relative to today) with nothing logged. Gives a 5 day current streak
 * (matches the profile on Social), a best streak of 9, and a calendar that looks lived in.
 */
const GAP_OFFSETS = new Set([-5, -15, -16, -22, -29, -33, -37]);

/** Small stable string hash (FNV-1a) so picks depend on the calendar date */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pickFrom = <T,>(list: T[], seed: number): T => list[seed % list.length];

/**
 * What kind of day a past date was (Figma 3.4's calendar colors):
 *   full     every meal logged, calories within 10% of the 2,200 goal (on target)
 *   big      a treat night, more than 10% over (over)
 *   partial  dinner never got logged (partial)
 */
type DayKind = "full" | "big" | "partial";

const kindRoll = (date: ISODate) => hash(`${date}:kind`) % 100;
const rollsPartial = (date: ISODate) => kindRoll(date) < 18;

function dayKind(date: ISODate): DayKind {
  const k = kindRoll(date);
  // Never two partial days within three days of each other (a run of them looks broken)
  if (rollsPartial(date) && !rollsPartial(addDays(date, -1)) && !rollsPartial(addDays(date, -2))) return "partial";
  const dow = fromISODate(date).getDay(); // 0 Sun .. 6 Sat
  const treatNight = dow === 5 || dow === 6 || dow === 0;
  return k >= (treatNight ? 78 : 93) ? "big" : "full";
}

/** Calories a past day is scaled to: full days 2,000-2,280, big days 2,470-2,720 */
function dayKcalTarget(date: ISODate, kind: DayKind): number {
  const r = (hash(`${date}:kcal`) % 1000) / 1000;
  return kind === "big" ? 2470 + r * 250 : 2000 + r * 280;
}

function slotsFor(date: ISODate, h: number, kind: DayKind): MealType[] {
  if (kind === "partial") return h % 3 === 0 ? ["breakfast", "snack", "lunch"] : ["breakfast", "lunch"];
  const dow = fromISODate(date).getDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6;
  if (kind === "big") return ["breakfast", "lunch", "snack", "dinner", "snack"];
  if (weekend) return h % 2 === 0 ? ["breakfast", "lunch", "snack", "dinner", "snack"] : ["breakfast", "lunch", "snack", "dinner"];
  if (h % 5 === 0) return ["breakfast", "lunch", "dinner"];
  return h % 4 === 1 ? ["breakfast", "snack", "lunch", "snack", "dinner"] : ["breakfast", "lunch", "snack", "dinner"];
}

/** Scale a full / big day's calories and macros (portions vary) to its target */
function scaleDayKcal(day: DiaryEntry[], target: number) {
  const kcal = day.reduce((a, e) => a + e.nutrition.calories, 0);
  if (kcal <= 0) return;
  const f = Math.min(1.7, Math.max(0.75, target / kcal));
  for (const e of day) {
    e.nutrition.calories = Math.round(e.nutrition.calories * f);
    e.nutrition.protein = Math.round(e.nutrition.protein * f);
    e.nutrition.carbs = Math.round(e.nutrition.carbs * f);
    e.nutrition.fat = Math.round(e.nutrition.fat * f);
  }
}

/**
 * What a typical past day adds up to (fiber + every micro). Meals are picked per date, so
 * raw totals swing a lot (a salmon day has 4x the vitamin D of a pasta day); each past day
 * is scaled toward these amounts, +/-15% per date and a little with that day's calories,
 * so any 7-day window averages out the same. Relative values between meals stay as written.
 * Percentages are of the registry targets in lib/nutrients.ts.
 */
const DAY_TARGET: Record<keyof Micros | "fiber", number> = {
  fiber: 22, // 73% of 30 g: a bit low
  iron: 9, // 50% of 18 mg: low
  calcium: 1050, // 105%: on track
  potassium: 3300, // 70%: a bit low
  vitaminA: 640, // 71%: a bit low
  vitaminC: 98, // 109%: on track
  vitaminD: 14, // 70%: a bit low
  sodium: 2900, // 126% of the 2,300 mg limit: over
  sugar: 41, // 82% of 50 g: on track
  saturatedFat: 17, // 85% of 20 g: on track
  cholesterol: 250, // 83% of 300 mg: on track
};
/** Mean calories of a seeded past day (partial days included) */
const TYPICAL_DAY_KCAL = 2050;

function normalizeDay(day: DiaryEntry[], date: ISODate) {
  const kcal = day.reduce((a, e) => a + e.nutrition.calories, 0);
  // Fourth root: a half-logged day still has fewer micros, without swinging the weekly average
  const size = Math.pow(Math.max(0.6, Math.min(1.4, kcal / TYPICAL_DAY_KCAL)), 0.25);
  const scale = (key: keyof typeof DAY_TARGET, total: number) => {
    const jitter = 1 + ((hash(`${date}:${key}`) % 1000) / 1000 - 0.5) * 0.3;
    return total > 0 ? Math.min(6, Math.max(0.3, (DAY_TARGET[key] * size * jitter) / total)) : 1;
  };
  const fiber = scale("fiber", day.reduce((a, e) => a + e.nutrition.fiber, 0));
  for (const e of day) e.nutrition.fiber = Math.round(e.nutrition.fiber * fiber * 10) / 10;
  for (const k of MICRO_KEYS) {
    const f = scale(k, day.reduce((a, e) => a + (e.micros?.[k] ?? 0), 0));
    for (const e of day) if (e.micros) e.micros[k] = roundMicro(k, (e.micros[k] ?? 0) * f);
  }
}

export function seedDiary(today: ISODate): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  for (let offset = -HISTORY_DAYS; offset <= 0; offset++) {
    if (GAP_OFFSETS.has(offset)) continue;
    const date = addDays(today, offset);
    const h = hash(date);
    const dow = fromISODate(date).getDay();
    const treatNight = dow === 5 || dow === 6 || dow === 0;
    const kind = dayKind(date);
    const slots: MealType[] = offset === 0 ? ["breakfast", "lunch"] : slotsFor(date, h, kind);
    const day: DiaryEntry[] = [];

    slots.forEach((slot, i) => {
      const seed = hash(`${date}:${slot}:${i}`);
      const pick =
        offset === 0 && TODAY[slot]
          ? TODAY[slot]
          : slot === "dinner" && treatNight
            ? pickFrom(TREAT_DINNERS, seed)
            : slot === "snack" && (treatNight || kind === "big") && slots[i - 1] === "dinner"
              ? pickFrom(TREAT_SNACKS, seed)
              : pickFrom(POOL[slot], seed);
      // Snacks land after whichever meal precedes them
      const baseHour = slot === "snack" && i > 0 ? (SNACK_AFTER[slots[i - 1]] ?? HOURS.snack) : HOURS[slot];
      const at = fromISODate(date);
      const dayStart = at.getTime();
      at.setHours(Math.floor(baseHour), Math.round((baseHour % 1) * 60) + (seed % 25));
      // A morning demo must not show lunch "logged" at 12:40 PM: keep today's times in the past
      const latest = Date.now() - (slots.length - i) * 40 * 60_000;
      const loggedAt = offset === 0 && at.getTime() > latest ? Math.max(dayStart + i * 60_000, latest) : at.getTime();
      day.push({
        id: `seed-${date}-${slot}-${i}`,
        date,
        meal: slot,
        name: pick.name,
        portion: pick.portion,
        nutrition: { ...pick.n },
        micros: { ...pick.m },
        source: "seed",
        loggedAt,
      });
    });
    // Today keeps the meals' own numbers (it's half a day, and the live demo builds on it)
    if (offset < 0) {
      if (kind !== "partial") scaleDayKcal(day, dayKcalTarget(date, kind));
      normalizeDay(day, date);
    }
    out.push(...day);
  }
  return out;
}

export function seedActivity(today: ISODate): Record<ISODate, DailyActivity> {
  const out: Record<ISODate, DailyActivity> = {};
  for (let offset = -HISTORY_DAYS; offset <= 0; offset++) {
    const date = addDays(today, offset);
    const h = hash(`activity:${date}`);
    const dow = fromISODate(date).getDay();
    const restDay = h % 4 === 0;
    out[date] =
      offset === 0
        ? // Today is still in progress
          { steps: 4860, exerciseKcal: 140, exerciseMinutes: 20, sleepHours: 7.2 }
        : {
            steps: 4200 + (h % 7400) + (dow === 0 || dow === 6 ? 1500 : 0),
            exerciseKcal: restDay ? 0 : 120 + ((h >>> 3) % 300),
            exerciseMinutes: restDay ? 0 : 20 + ((h >>> 5) % 45),
            sleepHours: Math.round((6.1 + ((h >>> 7) % 23) / 10) * 10) / 10,
          };
  }
  return out;
}
