/**
 * Seeded diary: a believable recent history relative to *today*, so the demo always
 * looks current. Today has breakfast + lunch logged, leaving dinner for the live demo.
 */
import type { DailyActivity, DiaryEntry, ISODate, MealType, Micros, Nutrition } from "@/lib/types";
import { addDays, fromISODate } from "@/lib/utils";

type SeedMeal = { name: string; portion: string; n: Nutrition; m: Micros };

const meal = (
  name: string,
  portion: string,
  [calories, protein, carbs, fat, fiber]: number[],
  [iron, calcium, vitaminA]: number[],
): SeedMeal => ({ name, portion, n: { calories, protein, carbs, fat, fiber }, m: { iron, calcium, vitaminA } });

const POOL: Record<MealType, SeedMeal[]> = {
  breakfast: [
    meal("Greek yogurt, berries & granola", "1 bowl", [320, 18, 42, 9, 4], [0.6, 220, 30]),
    meal("Avocado toast with a fried egg", "2 slices", [410, 17, 34, 23, 9], [2.4, 90, 160]),
    meal("Oatmeal with banana & peanut butter", "1 bowl", [390, 13, 58, 13, 8], [2.9, 60, 10]),
    meal("Veggie omelette", "3 eggs", [340, 24, 8, 23, 2], [3.1, 140, 520]),
    meal("Spinach banana protein smoothie", "1 large glass", [300, 25, 40, 5, 6], [2.5, 300, 280]),
  ],
  lunch: [
    meal("Chicken burrito bowl", "1 bowl", [640, 42, 68, 20, 12], [4.2, 180, 210]),
    meal("Turkey & swiss sandwich", "1 sandwich", [520, 34, 46, 21, 5], [3.0, 320, 90]),
    meal("Beef pho", "1 large bowl", [560, 35, 70, 12, 3], [4.6, 90, 60]),
    meal("Chicken caesar salad", "1 plate", [480, 38, 18, 28, 4], [2.2, 200, 380]),
    meal("Leftover tomato pasta", "1.5 cups", [590, 22, 82, 18, 6], [3.4, 150, 140]),
    meal("Salmon sushi combo", "10 pieces", [540, 26, 80, 10, 3], [2.0, 60, 120]),
  ],
  dinner: [
    meal("Salmon with rice & greens", "1 plate", [620, 40, 55, 24, 5], [2.1, 110, 480]),
    meal("Spaghetti bolognese", "1 bowl", [710, 34, 86, 22, 7], [5.2, 160, 220]),
    meal("Chicken veggie stir fry", "1 plate", [560, 42, 52, 18, 6], [3.3, 90, 640]),
    meal("Homemade margherita pizza", "2 slices", [640, 28, 72, 26, 4], [4.0, 380, 200]),
    meal("Beef tacos", "3 tacos", [680, 36, 54, 34, 8], [4.8, 230, 160]),
    meal("Chickpea tofu curry with rice", "1 bowl", [590, 22, 78, 20, 9], [6.1, 420, 350]),
  ],
  snack: [
    meal("Apple & almond butter", "1 apple + 1 tbsp", [250, 6, 28, 14, 6], [0.8, 70, 5]),
    meal("Protein bar", "1 bar", [210, 20, 22, 7, 5], [2.0, 150, 0]),
    meal("Dark chocolate", "2 squares", [170, 2, 13, 12, 3], [3.4, 20, 0]),
    meal("Hummus & carrots", "1 snack box", [180, 6, 20, 9, 6], [1.4, 60, 850]),
    meal("Oat milk latte", "1 medium", [190, 10, 18, 7, 0], [0.1, 350, 140]),
  ],
};

const HOURS: Record<MealType, number> = { breakfast: 8, lunch: 12.5, dinner: 19, snack: 15.5 };

/** Days (relative to today) that have entries. A few gaps make the calendar look real. */
const LOGGED_OFFSETS = [-12, -10, -9, -8, -6, -5, -4, -3, -2, -1, 0];

export function seedDiary(today: ISODate): DiaryEntry[] {
  const out: DiaryEntry[] = [];
  for (const offset of LOGGED_OFFSETS) {
    const date = addDays(today, offset);
    const k = offset + 20; // stable, positive pick index
    const slots: MealType[] =
      offset === 0 ? ["breakfast", "lunch"] : k % 3 === 0 ? ["breakfast", "lunch", "dinner"] : ["breakfast", "lunch", "snack", "dinner"];
    slots.forEach((slot, i) => {
      const pool = POOL[slot];
      const pick = pool[(k * 7 + i * 3) % pool.length];
      const at = fromISODate(date);
      at.setHours(Math.floor(HOURS[slot]), (HOURS[slot] % 1) * 60);
      out.push({
        id: `seed-${date}-${slot}`,
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
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(today, offset);
    const k = offset + 20;
    out[date] = {
      steps: 4200 + ((k * 1879) % 7000),
      exerciseKcal: offset === 0 ? 140 : 90 + ((k * 61) % 330),
      exerciseMinutes: offset === 0 ? 20 : 15 + ((k * 13) % 50),
      sleepHours: Math.round((6.2 + ((k * 7) % 20) / 10) * 10) / 10,
    };
  }
  return out;
}
