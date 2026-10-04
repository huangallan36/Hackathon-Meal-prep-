"use client";

/**
 * Fridge -> recipes -> cooking state. Persisted so a reload mid-cook keeps your place.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storageKey } from "@/lib/config";
import { persistStorage } from "@/lib/storage";
import type { Recipe, RecipeMatch } from "@/lib/types";

export interface KitchenTimer {
  /** epoch ms when it rings */
  endsAt: number;
  totalSec: number;
  label: string;
  /** set when it has rung, so the UI can show "Done!" until dismissed */
  doneAt?: number;
}

interface KitchenState {
  /** Editable ingredient chips (lowercase names) */
  ingredients: string[];
  ingredientsSource: "gemini" | "fallback" | "manual" | null;
  /** Small data URL thumbnail of the scanned fridge photo */
  fridgePhoto: string | null;

  /** Last recipe suggestions for `matchesFor` */
  matches: RecipeMatch[];
  /** Sorted, comma-joined ingredient list the matches were computed for */
  matchesFor: string;
  matchesSource: "live" | "cache" | null;

  /** Recipe being cooked */
  activeRecipe: Recipe | null;
  /** -1 = overview / not started; 0..steps.length-1 = current step */
  stepIndex: number;
  cookStartedAt: number | null;
  /** Set when the last step is done; drives the "Snap your finished meal" prompt */
  finishedRecipeId: number | null;
  timer: KitchenTimer | null;

  /** Most recent first; feeds "Recently made" */
  recentRecipeIds: number[];
  /** Grocery checklist ticks, keyed by `${recipeId}:${ingredientName}` */
  groceryChecked: Record<string, boolean>;

  setIngredients: (list: string[], source: KitchenState["ingredientsSource"]) => void;
  addIngredient: (name: string) => void;
  removeIngredient: (name: string) => void;
  setFridgePhoto: (dataUrl: string | null) => void;
  setMatches: (matches: RecipeMatch[], forKey: string, source: "live" | "cache") => void;

  /** Load a recipe into cooking mode at the overview (stepIndex -1) */
  startCooking: (recipe: Recipe) => void;
  goToStep: (index: number) => void;
  /** Returns false when already on the last step (caller shows the "snap your meal" prompt) */
  nextStep: () => boolean;
  prevStep: () => void;
  finishCooking: () => void;
  setTimer: (timer: KitchenTimer | null) => void;
  toggleGrocery: (key: string) => void;
}

export const ingredientsKey = (list: string[]) =>
  [...new Set(list.map((i) => i.toLowerCase().trim()).filter(Boolean))].sort().join(",");

export const useKitchen = create<KitchenState>()(
  persist(
    (set, get) => ({
      ingredients: [],
      ingredientsSource: null,
      fridgePhoto: null,
      matches: [],
      matchesFor: "",
      matchesSource: null,
      activeRecipe: null,
      stepIndex: -1,
      cookStartedAt: null,
      finishedRecipeId: null,
      timer: null,
      // Seeded like the diary history: the design's "Recently made" (Beef Teriyaki, Seared Salmon, Harvest Salad)
      recentRecipeIds: [910004, 910005, 910006],
      groceryChecked: {},

      setIngredients: (list, ingredientsSource) =>
        set({ ingredients: [...new Set(list.map((i) => i.toLowerCase().trim()).filter(Boolean))], ingredientsSource }),
      addIngredient: (name) => {
        const n = name.toLowerCase().trim();
        if (!n) return;
        set((s) => (s.ingredients.includes(n) ? s : { ingredients: [...s.ingredients, n] }));
      },
      removeIngredient: (name) => set((s) => ({ ingredients: s.ingredients.filter((i) => i !== name) })),
      setFridgePhoto: (fridgePhoto) => set({ fridgePhoto }),
      setMatches: (matches, matchesFor, matchesSource) => set({ matches, matchesFor, matchesSource }),

      startCooking: (recipe) =>
        set((s) => ({
          activeRecipe: recipe,
          stepIndex: s.activeRecipe?.id === recipe.id ? s.stepIndex : -1,
          cookStartedAt: s.activeRecipe?.id === recipe.id ? s.cookStartedAt : Date.now(),
          finishedRecipeId: s.activeRecipe?.id === recipe.id ? s.finishedRecipeId : null,
        })),
      goToStep: (index) => {
        const r = get().activeRecipe;
        if (!r) return;
        set({ stepIndex: Math.max(-1, Math.min(index, r.steps.length - 1)) });
      },
      nextStep: () => {
        const { activeRecipe, stepIndex } = get();
        if (!activeRecipe) return false;
        if (stepIndex >= activeRecipe.steps.length - 1) return false;
        set({ stepIndex: stepIndex + 1 });
        return true;
      },
      prevStep: () => set((s) => ({ stepIndex: Math.max(-1, s.stepIndex - 1) })),
      finishCooking: () =>
        set((s) => {
          const id = s.activeRecipe?.id ?? null;
          return {
            finishedRecipeId: id,
            recentRecipeIds: id == null ? s.recentRecipeIds : [id, ...s.recentRecipeIds.filter((r) => r !== id)].slice(0, 12),
          };
        }),
      setTimer: (timer) => set({ timer }),
      toggleGrocery: (key) => set((s) => ({ groceryChecked: { ...s.groceryChecked, [key]: !s.groceryChecked[key] } })),
    }),
    { name: storageKey("kitchen"), storage: persistStorage },
  ),
);
