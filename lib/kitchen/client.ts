"use client";

/**
 * Client side of the kitchen feature: fridge scan and recipe matching.
 * Both functions always resolve with something usable (network failures fall back
 * to the sample fridge / the bundled catalog), so screens never dead-end.
 */
import { TIMEOUTS } from "@/lib/config";
import { fetchJSON, postJSON } from "@/lib/http";
import { thumbnailFromDataUrl, toImageInput } from "@/lib/image";
import { rankByIngredients } from "@/lib/recipes/catalog";
import { SAMPLE_FRIDGE_INGREDIENTS } from "@/lib/sample";
import { ingredientsKey, useKitchen } from "@/lib/stores/kitchen";
import type { ByIngredientsResponse, IngredientsRequest, IngredientsResponse, RecipeMatch } from "@/lib/types";
import { uniqueIngredients } from "./sanitize";

export interface ScanResult {
  ingredients: string[];
  source: "gemini" | "fallback";
}

/** Send a photo (data URL or sample path) to Gemini vision. Never rejects. */
export async function scanFridge(src: string): Promise<ScanResult> {
  try {
    const body: IngredientsRequest = { image: toImageInput(src) };
    const res = await postJSON<IngredientsResponse>("/api/vision/ingredients", body, { timeoutMs: TIMEOUTS.vision });
    const ingredients = uniqueIngredients(Array.isArray(res.ingredients) ? res.ingredients : []);
    if (ingredients.length === 0) throw new Error("empty scan");
    return { ingredients, source: res.source === "gemini" ? "gemini" : "fallback" };
  } catch {
    return { ingredients: [...SAMPLE_FRIDGE_INGREDIENTS], source: "fallback" };
  }
}

/**
 * Small, persistable copy of the scanned photo for the store. Data URLs are
 * re-encoded to a ~480px thumbnail; paths/URLs (the sample) are kept as-is.
 */
export async function fridgeThumbnail(src: string): Promise<string | null> {
  if (!src.startsWith("data:")) return src;
  try {
    return await thumbnailFromDataUrl(src, 360, 0.7);
  } catch {
    return null;
  }
}

export interface MatchesResult {
  matches: RecipeMatch[];
  source: "live" | "cache";
}

/** One request per ingredient set, even if two screens ask at once (prefetch + page). */
const inflight = new Map<string, Promise<MatchesResult>>();

/**
 * Recipe suggestions for a fridge. Stores the result in useKitchen (matches/matchesFor)
 * so returning to /ai/recipes is instant. Never rejects.
 */
export function fetchMatches(ingredients: string[]): Promise<MatchesResult> {
  const key = ingredientsKey(ingredients);
  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<MatchesResult> => {
    let result: MatchesResult;
    try {
      const qs = new URLSearchParams({ ingredients: key });
      const res = await fetchJSON<ByIngredientsResponse>(`/api/recipes/by-ingredients?${qs}`, {
        timeoutMs: TIMEOUTS.recipes,
      });
      const matches = Array.isArray(res.matches) ? res.matches.filter((m) => m?.recipe?.steps?.length) : [];
      if (matches.length === 0) throw new Error("no matches");
      result = { matches, source: res.source === "live" ? "live" : "cache" };
    } catch {
      result = { matches: rankByIngredients(key ? key.split(",") : [], 8), source: "cache" };
    }
    useKitchen.getState().setMatches(result.matches, key, result.source);
    return result;
  })();

  inflight.set(key, run);
  void run.finally(() => inflight.delete(key));
  return run;
}
