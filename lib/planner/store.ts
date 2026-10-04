"use client";

/**
 * "This week" meal plan, plus the recipes the user saved (heart / bookmark). Each entry keeps
 * a small snapshot (title, photo, time) so it renders instantly even for live recipes that
 * aren't in the catalog.
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

export interface SavedRecipe {
  recipeId: number;
  title: string;
  image: string;
  savedAt: number;
}

interface PlannerState {
  plan: PlannedMeal[];
  saved: SavedRecipe[];
  /** Adds the recipe on that day, or removes it if already there. Returns true when added. */
  togglePlanned: (date: ISODate, recipe: Recipe) => boolean;
  removePlanned: (id: string) => void;
  /** Saves or unsaves a recipe. Returns true when saved. */
  toggleSaved: (recipe: Pick<Recipe, "id" | "title" | "image">) => boolean;
}

const MAX_PLANNED = 40;
const MAX_SAVED = 100;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Persisted plan -> well-formed meals only (runs during hydration, so it must be defined first) */
function revivePlan(value: unknown): PlannedMeal[] {
  if (!Array.isArray(value)) return [];
  const out: PlannedMeal[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const p = item as Partial<PlannedMeal>;
    if (typeof p.id !== "string" || typeof p.date !== "string" || !ISO_DATE.test(p.date)) continue;
    if (!Number.isSafeInteger(p.recipeId) || typeof p.title !== "string") continue;
    out.push({
      id: p.id,
      date: p.date,
      recipeId: p.recipeId as number,
      title: p.title,
      image: typeof p.image === "string" ? p.image : "",
      readyInMinutes: typeof p.readyInMinutes === "number" && Number.isFinite(p.readyInMinutes) ? p.readyInMinutes : 30,
      addedAt: typeof p.addedAt === "number" && Number.isFinite(p.addedAt) ? p.addedAt : 0,
    });
  }
  return out.slice(-MAX_PLANNED);
}

function reviveSaved(value: unknown): SavedRecipe[] {
  if (!Array.isArray(value)) return [];
  const out: SavedRecipe[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const s = item as Partial<SavedRecipe>;
    if (!Number.isSafeInteger(s.recipeId) || typeof s.title !== "string") continue;
    if (out.some((x) => x.recipeId === s.recipeId)) continue;
    out.push({
      recipeId: s.recipeId as number,
      title: s.title,
      image: typeof s.image === "string" ? s.image : "",
      savedAt: typeof s.savedAt === "number" && Number.isFinite(s.savedAt) ? s.savedAt : 0,
    });
  }
  return out.slice(-MAX_SAVED);
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => ({
      plan: [],
      saved: [],
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
      toggleSaved: (recipe) => {
        if (get().saved.some((x) => x.recipeId === recipe.id)) {
          set((s) => ({ saved: s.saved.filter((x) => x.recipeId !== recipe.id) }));
          return false;
        }
        const item: SavedRecipe = { recipeId: recipe.id, title: recipe.title, image: recipe.image, savedAt: Date.now() };
        set((s) => ({ saved: [...s.saved, item].slice(-MAX_SAVED) }));
        return true;
      },
    }),
    {
      name: storageKey("planner"),
      storage: persistStorage,
      partialize: (s) => ({ plan: s.plan, saved: s.saved }),
      // Whatever is in localStorage, the screen only ever sees well-formed entries.
      merge: (persisted, current) => {
        const p = persisted as { plan?: unknown; saved?: unknown } | null;
        return { ...current, plan: revivePlan(p?.plan), saved: reviveSaved(p?.saved) };
      },
    },
  ),
);

export function plannedOn(plan: PlannedMeal[], date: ISODate): PlannedMeal[] {
  return plan.filter((p) => p.date === date).sort((a, b) => a.addedAt - b.addedAt);
}

/** Whether a recipe is saved (heart / bookmark), reactive */
export function useIsSaved(recipeId: number): boolean {
  return usePlanner((s) => s.saved.some((x) => x.recipeId === recipeId));
}
