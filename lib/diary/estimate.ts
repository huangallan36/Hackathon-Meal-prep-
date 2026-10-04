"use client";

/**
 * Client side of "log what I ate": estimate foods from a description (Gemini through
 * /api/nutrition/estimate, the local food table when offline) and write them to the diary.
 * Shared by the per-meal "Add" sheet and the voice log_food action. Never throws.
 */
import { TIMEOUTS } from "@/lib/config";
import { postJSON } from "@/lib/http";
import { useDiary } from "@/lib/stores/diary";
import type { DiaryEntry, FoodEstimateRequest, FoodEstimateResponse, ISODate, MealType, SpokenFood } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { FOOD_ITEMS_MAX, FOOD_TEXT_MAX, cleanLine, sanitizeFoods } from "./food-estimate";
import { localFoodEstimate, mentionsFood } from "./food-table";

export interface FoodEstimate {
  items: SpokenFood[];
  source: FoodEstimateResponse["source"];
}

/**
 * Estimate the foods in `text`. Always resolves. `items` is empty for empty text, or when
 * the server found no food in it and the local table doesn't recognize any either.
 * Offline / timeout / server error: the local food table.
 */
export async function estimateFoods(text: string, meal?: MealType, opts: { timeoutMs?: number } = {}): Promise<FoodEstimate> {
  const clean = cleanLine(text, FOOD_TEXT_MAX);
  if (!clean) return { items: [], source: "fallback" };
  try {
    const body: FoodEstimateRequest = { text: clean, ...(meal ? { meal } : {}) };
    const res = await postJSON<FoodEstimateResponse>("/api/nutrition/estimate", body, { timeoutMs: opts.timeoutMs ?? TIMEOUTS.nutrition });
    const source = res?.source === "gemini" ? "gemini" : "fallback";
    const items = sanitizeFoods(res?.items);
    if (items.length) return { items, source };
    if (!mentionsFood(clean)) return { items: [], source };
  } catch (err) {
    console.warn("[diary] food estimate unavailable, using the food table:", err instanceof Error ? err.message : err);
  }
  try {
    return { items: localFoodEstimate(clean), source: "fallback" };
  } catch {
    return { items: [], source: "fallback" };
  }
}

/** Add one diary entry per item (in order) and return them. Bad items are skipped, not thrown. */
export function logFoods(items: SpokenFood[], meal: MealType, date: ISODate = todayISO()): DiaryEntry[] {
  const add = useDiary.getState().addEntry;
  const now = Date.now();
  const out: DiaryEntry[] = [];
  items.slice(0, FOOD_ITEMS_MAX).forEach((item, i) => {
    try {
      out.push(
        add({
          date,
          meal,
          name: item.name,
          portion: item.portion,
          nutrition: { calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, fiber: item.fiber },
          micros: item.micros,
          source: "ai",
          estimated: true,
          // Keep the spoken order inside the meal
          loggedAt: now + i,
        }),
      );
    } catch (err) {
      console.warn("[diary] could not log item:", err instanceof Error ? err.message : err);
    }
  });
  return out;
}
