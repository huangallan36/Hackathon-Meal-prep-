"use client";

/**
 * "This week" meal plan. Each planned meal keeps a small snapshot (title, photo, time) so
 * the week strip renders instantly even for live recipes that aren't in the catalog.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storageKey } from "@/lib/config";
import { persistStorage } from "@/lib/storage";
import type { ISODate, Recipe } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

export interface PlannedMeal {
  id: string;
  date: ISODate;
  recipeId: number;
  title: string;
  image: string;
  readyInMinutes: number;
  addedAt: number;
}

interface PlannerState {
  plan: PlannedMeal[];
  /** Adds the recipe on that day, or removes it if already there. Returns true when added. */
  togglePlanned: (date: ISODate, recipe: Recipe) => boolean;
  removePlanned: (id: string) => void;
}

const MAX_PLANNED = 40;

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      plan: [],
      togglePlanned: (date, recipe) => {
        const existing = get().plan.find((p) => p.date === date && p.recipeId === recipe.id);
        if (existing) {
          set((s) => ({ plan: s.plan.filter((p) => p.id !== existing.id) }));
          return false;
        }
        const item: PlannedMeal = {
          id: uid("plan"),
          date,
          recipeId: recipe.id,
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.readyInMinutes,
          addedAt: Date.now(),
        };
        // Past days fall off whenever something new is planned.
        const today = todayISO();
        set((s) => ({ plan: [...s.plan.filter((p) => p.date >= today), item].slice(-MAX_PLANNED) }));
        return true;
      },
      removePlanned: (id) => set((s) => ({ plan: s.plan.filter((p) => p.id !== id) })),
    }),
    { name: storageKey("planner"), storage: persistStorage },
  ),
);

export function plannedOn(plan: PlannedMeal[], date: ISODate): PlannedMeal[] {
  return plan.filter((p) => p.date === date).sort((a, b) => a.addedAt - b.addedAt);
}
