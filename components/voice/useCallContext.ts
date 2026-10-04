"use client";

/**
 * What the call screen can offer next, derived from the kitchen state and the conversation:
 * the recipe the conversation is about (with what's missing for it) and the quick actions
 * under the reply (Show recipe / Add 2 to groceries / Scan my fridge / Show recipes).
 */
import { useMemo } from "react";
import { groceryPlan } from "@/lib/kitchen/groceries";
import { cookHref, FRIDGE_SCAN_HREF, groceriesHref, RECIPES_HREF } from "@/lib/kitchen/routes";
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import type { Recipe } from "@/lib/types";

export interface RecipeRef {
  recipe: Recipe;
  /** Ingredient names still to buy; null when unknown (no fridge scan yet) */
  missing: string[] | null;
}

/** A recipe the app knows about (suggested or being cooked), with what's missing for it */
export function useRecipeRef(id: number | null | undefined): RecipeRef | null {
  const matches = useKitchen((s) => s.matches);
  const active = useKitchen((s) => s.activeRecipe);
  const fridge = useKitchen((s) => s.ingredients);
  return useMemo(() => {
    if (!id) return null;
    const match = matches.find((m) => m.recipe.id === id);
    if (match) return { recipe: match.recipe, missing: match.missing.map((i) => i.name) };
    if (active?.id !== id) return null;
    if (!fridge.length) return { recipe: active, missing: null };
    try {
      return { recipe: active, missing: groceryPlan(active, fridge).need.map((i) => i.name) };
    } catch {
      return { recipe: active, missing: null };
    }
  }, [id, matches, active, fridge]);
}

export type QuickActionKind = "recipe" | "groceries" | "fridge" | "recipes";

export interface QuickAction {
  kind: QuickActionKind;
  label: string;
  href: string;
}

/**
 * Up to two contextual quick actions for the call screen, most specific first:
 * the recipe the latest reply is about (else the one in progress), its missing groceries,
 * a fridge scan when no ingredients are known, or the suggestion list.
 */
export function useQuickActions(): QuickAction[] {
  const lastRecipeId = useVoice((s) => {
    for (let i = s.transcript.length - 1; i >= 0; i--) {
      const line = s.transcript[i];
      if (line.role === "sous") return line.recipeId ?? null;
    }
    return null;
  });
  const active = useKitchen((s) => (s.activeRecipe && s.finishedRecipeId !== s.activeRecipe.id ? s.activeRecipe.id : null));
  const hasIngredients = useKitchen((s) => s.ingredients.length > 0);
  const hasMatches = useKitchen((s) => s.matches.length > 0);
  const ref = useRecipeRef(lastRecipeId ?? active);

  return useMemo(() => {
    const out: QuickAction[] = [];
    if (ref) {
      out.push({ kind: "recipe", label: "Show recipe", href: cookHref(ref.recipe.id) });
      if (ref.missing && ref.missing.length > 0) {
        // Figma: "Add 2 to groceries"
        out.push({ kind: "groceries", label: `Add ${ref.missing.length} to groceries`, href: groceriesHref(ref.recipe.id) });
      }
    }
    if (!hasIngredients) out.push({ kind: "fridge", label: "Scan my fridge", href: FRIDGE_SCAN_HREF });
    else if (hasMatches && !ref) out.push({ kind: "recipes", label: "Show recipes", href: RECIPES_HREF });
    return out.slice(0, 2);
  }, [ref, hasIngredients, hasMatches]);
}
