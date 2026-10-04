/**
 * Seeded diary: a believable recent history relative to *today*, so the demo always
 * looks current. Today has breakfast + lunch logged, leaving dinner for the live demo.
 *
 * Meals are picked from a hash of the calendar date (not the offset), so a given day
 * keeps the same meals as the demo rolls forward. Weekends run a little richer, a few
 * days land slightly over the 2,100 kcal goal, most land a bit under.
 */
import type { DailyActivity, DiaryEntry, ISODate, MealType, Micros, Nutrition } from "@/lib/types";
import { addDays, fromISODate } from "@/lib/utils";

/** Bump when the seed changes shape so persisted stores regenerate it */
export const SEED_VERSION = 2;

type SeedMeal = { name: string; portion: string; n: Nutrition; m: Micros };

const meal = (
  name: string,
  portion: string,
  [calories, protein, carbs, fat, fiber]: number[],
  [iron, calcium, vitaminA]: number[],
): SeedMeal => ({ name, portion, n: { calories, protein, carbs, fat, fiber }, m: { iron, calcium, vitaminA } });

const POOL: Record<MealType, SeedMeal[]> = {
  breakfast: [
    meal("Greek yogurt, berries & granola", "1 bowl", [320, 18, 42, 9, 4], [1.1, 240, 30]),
    meal("Avocado toast with a fried egg", "2 slices", [410, 17, 34, 23, 9], [2.4, 90, 160]),
    meal("Oatmeal with banana & peanut butter", "1 bowl", [390, 13, 58, 13, 8], [2.9, 60, 10]),
    meal("Veggie omelette", "3 eggs", [340, 24, 8, 23, 2], [3.1, 140, 520]),
    meal("Spinach banana protein smoothie", "1 large glass", [300, 25, 40, 5, 6], [2.5, 300, 280]),
    meal("Overnight oats with chia", "1 jar", [360, 15, 50, 11, 10], [3.2, 290, 25]),
    meal("Breakfast burrito", "1 burrito", [520, 28, 48, 24, 6], [3.6, 240, 380]),
    meal("Cottage cheese, peach & honey", "1 bowl", [280, 24, 30, 6, 2], [0.4, 180, 40]),
  ],
  lunch: [
    meal("Chicken burrito bowl", "1 bowl", [640, 42, 68, 20, 12], [4.8, 180, 210]),
    meal("Turkey & swiss sandwich", "1 sandwich", [520, 34, 46, 21, 5], [3.0, 320, 90]),
    meal("Beef pho", "1 large bowl", [560, 35, 70, 12, 3], [4.6, 90, 60]),
    meal("Chicken caesar salad", "1 plate", [480, 38, 18, 28, 4], [2.2, 200, 380]),
    meal("Leftover tomato pasta", "1.5 cups", [590, 22, 82, 18, 6], [3.4, 150, 140]),
    meal("Salmon sushi combo", "10 pieces", [540, 26, 80, 10, 3], [2.0, 60, 120]),
    meal("Lentil soup & sourdough", "1 bowl + 1 slice", [480, 24, 70, 10, 15], [6.4, 110, 260]),
    meal("Tuna poke bowl", "1 bowl", [610, 36, 72, 18, 6], [2.6, 70, 180]),
  ],
  dinner: [
    meal("Salmon with rice & greens", "1 plate", [620, 40, 55, 24, 5], [2.1, 110, 480]),
    meal("Spaghetti bolognese", "1 bowl", [710, 34, 86, 22, 7], [5.2, 160, 220]),
    meal("Chicken veggie stir fry", "1 plate", [560, 42, 52, 18, 6], [3.3, 90, 640]),
    meal("Chickpea tofu curry with rice", "1 bowl", [590, 22, 78, 20, 9], [6.1, 420, 350]),
    meal("Teriyaki chicken & broccoli rice", "1 plate", [640, 44, 74, 15, 6], [2.6, 120, 300]),
    meal("Garlic shrimp linguine", "1 bowl", [660, 36, 78, 21, 5], [3.1, 180, 210]),
    meal("Sheet-pan sausage & veggies", "1 plate", [610, 28, 40, 36, 8], [2.8, 80, 720]),
  ],
  snack: [
    meal("Apple & almond butter", "1 apple + 1 tbsp", [250, 6, 28, 14, 6], [0.8, 70, 5]),
    meal("Protein bar", "1 bar", [210, 20, 22, 7, 5], [2.0, 150, 0]),
    meal("Dark chocolate", "2 squares", [170, 2, 13, 12, 3], [3.4, 20, 0]),
    meal("Hummus & carrots", "1 snack box", [180, 6, 20, 9, 6], [1.4, 60, 850]),
    meal("Oat milk latte", "1 medium", [190, 10, 18, 7, 0], [0.1, 350, 140]),
    meal("Trail mix", "1 handful", [220, 6, 18, 15, 3], [1.6, 40, 2]),
    meal("Banana", "1 medium", [105, 1, 27, 0, 3], [0.3, 6, 4]),
  ],
};

/** Friday/weekend dinners: the fun stuff */
const TREAT_DINNERS: SeedMeal[] = [
  meal("Homemade margherita pizza", "2 slices", [640, 28, 72, 26, 4], [4.0, 380, 200]),
  meal("Beef tacos", "3 tacos", [680, 36, 54, 34, 8], [4.8, 230, 160]),
  meal("Smash burger & side salad", "1 burger", [760, 38, 48, 42, 4], [5.1, 210, 140]),
  meal("Pad thai with chicken", "1 plate", [720, 34, 88, 24, 4], [3.6, 120, 90]),
];

/** Today's entries are fixed so the live demo always starts from the same numbers */
const TODAY: Partial<Record<MealType, SeedMeal>> = {
  breakfast: POOL.breakfast[0],
  lunch: POOL.lunch[0],
};

/** Typical hour + minute jitter range for each slot */
const HOURS: Record<MealType, number> = { breakfast: 8, lunch: 12.5, dinner: 19, snack: 15.5 };

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

function slotsFor(date: ISODate, h: number): MealType[] {
  const dow = fromISODate(date).getDay(); // 0 Sun .. 6 Sat
  const weekend = dow === 0 || dow === 6;
  if (weekend) return h % 2 === 0 ? ["breakfast", "lunch", "snack", "dinner", "snack"] : ["breakfast", "lunch", "snack", "dinner"];
  if (h % 5 === 0) return ["breakfast", "lunch", "dinner"];
  return h % 4 === 1 ? ["breakfast", "snack", "lunch", "snack", "dinner"] : ["breakfast", "lunch", "snack", "dinner"];
}

export function seedDiary(today: ISODate): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  for (let offset = -HISTORY_DAYS; offset <= 0; offset++) {
    if (GAP_OFFSETS.has(offset)) continue;
    const date = addDays(today, offset);
    const h = hash(date);
    const dow = fromISODate(date).getDay();
    const treatNight = dow === 5 || dow === 6;
    const slots: MealType[] = offset === 0 ? ["breakfast", "lunch"] : slotsFor(date, h);

    slots.forEach((slot, i) => {
      const seed = hash(`${date}:${slot}:${i}`);
      const pick =
        offset === 0 && TODAY[slot]
          ? TODAY[slot]
          : slot === "dinner" && treatNight
            ? pickFrom(TREAT_DINNERS, seed)
            : pickFrom(POOL[slot], seed);
      // Second snack of the day lands in the evening
      const baseHour = slot === "snack" && i > 2 ? 21 : HOURS[slot];
      const at = fromISODate(date);
      at.setHours(Math.floor(baseHour), Math.round((baseHour % 1) * 60) + (seed % 25));
      out.push({
        id: `seed-${date}-${slot}-${i}`,
        date,
        meal: slot,
        name: pick.name,
        portion: pick.portion,
        nutrition: { ...pick.n },
        micros: { ...pick.m },
        source: "seed",
        loggedAt: at.getTime(),
      });
    });
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
