"use client";

/**
 * Items the user adds to a recipe's grocery list by hand ("+ Add item — or just say it").
 * Persisted per recipe; their ticks live in useKitchen.groceryChecked like every other row.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storageKey } from "@/lib/config";
import { persistStorage } from "@/lib/storage";

/** Keeps one recipe's list readable */
export const MAX_EXTRAS = 20;

interface GroceryExtrasState {
  /** recipeId -> lowercase item names, in the order they were added */
  byRecipe: Record<string, string[]>;
  add: (recipeId: number, name: string) => void;
  remove: (recipeId: number, name: string) => void;
}

export const useGroceryExtras = create<GroceryExtrasState>()(
  persist(
    (set) => ({
      byRecipe: {},
      add: (recipeId, name) =>
        set((s) => {
          const list = s.byRecipe[recipeId] ?? [];
          if (list.includes(name) || list.length >= MAX_EXTRAS) return s;
          return { byRecipe: { ...s.byRecipe, [recipeId]: [...list, name] } };
        }),
      remove: (recipeId, name) =>
        set((s) => ({ byRecipe: { ...s.byRecipe, [recipeId]: (s.byRecipe[recipeId] ?? []).filter((n) => n !== name) } })),
    }),
    { name: storageKey("grocery-extras"), storage: persistStorage },
  ),
);

const EMPTY: string[] = [];

/** Stable empty array so selectors don't re-render on every store change */
export const extrasFor = (s: GroceryExtrasState, recipeId: number) => s.byRecipe[recipeId] ?? EMPTY;
