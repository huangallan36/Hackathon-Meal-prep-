"use client";

import { TIMEOUTS } from "@/lib/config";
import { fetchJSON } from "@/lib/http";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe, RecipeResponse } from "@/lib/types";

/**
 * Find a full recipe by id from the fastest source available:
 * active recipe -> current suggestions -> bundled cache -> /api/recipes/[id].
 * Returns null only if every source fails.
 */
export async function loadRecipe(id: number): Promise<Recipe | null> {
  const k = useKitchen.getState();
  if (k.activeRecipe?.id === id) return k.activeRecipe;
  const fromMatches = k.matches.find((m) => m.recipe.id === id)?.recipe;
  if (fromMatches?.steps.length) return fromMatches;
  const cached = getCachedRecipe(id);
  if (cached) return cached;
  try {
    const res = await fetchJSON<RecipeResponse>(`/api/recipes/${id}`, { timeoutMs: TIMEOUTS.recipes });
    return res.recipe;
  } catch {
    return fromMatches ?? null;
  }
}
