"use client";

/**
 * Client side of the kitchen feature: fridge scan and recipe matching.
 * Both functions always resolve with something usable (network failures fall back
 * to the sample fridge / the bundled catalog), so screens never dead-end.
 */
import { TIMEOUTS } from "@/lib/config";
import { fetchJSON, postJSON } from "@/lib/http";
import { thumbnailFromDataUrl, toImageInput } from "@/lib/image";
import { getCachedRecipe, rankByIngredients } from "@/lib/recipes/catalog";
import { SAMPLE_FRIDGE_INGREDIENTS } from "@/lib/sample";
import { ingredientsKey, useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import type { ByIngredientsResponse, IngredientsRequest, IngredientsResponse, Recipe, RecipeMatch } from "@/lib/types";
import { speak } from "@/lib/voice/engine";
import { recipesLine } from "./format";
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
      const matches = (Array.isArray(res?.matches) ? res.matches : [])
        .filter((m) => Array.isArray(m?.recipe?.steps) && m.recipe.steps.length > 0)
        .map((m) => ({
          recipe: m.recipe,
          used: Array.isArray(m.used) ? m.used : [],
          missing: Array.isArray(m.missing) ? m.missing : [],
        }));
      if (matches.length === 0) throw new Error("no matches");
      result = { matches, source: res.source === "live" ? "live" : "cache" };
    } catch {
      result = { matches: rankByIngredients(key ? key.split(",") : [], 8), source: "cache" };
    }
    // Only store it if the fridge hasn't changed meanwhile, so a slow, stale answer
    // can't overwrite newer suggestions (and send /ai/recipes back to its skeleton).
    if (ingredientsKey(useKitchen.getState().ingredients) === key) {
      useKitchen.getState().setMatches(result.matches, key, result.source);
    }
    return result;
  })();

  inflight.set(key, run);
  void run.finally(() => inflight.delete(key));
  return run;
}

/* ------------------------------------------------------------------ */
/* Voice + misc                                                         */
/* ------------------------------------------------------------------ */

/** Speak only during a voice session; a TTS hiccup must never break a screen. */
export function sayIfSession(text: string): void {
  try {
    void speak(text, { onlyIfSession: true, source: "local" }).catch(() => undefined);
  } catch {
    /* engine not ready */
  }
}

const noop = () => {};

/**
 * Speak a screen's line during a voice session without talking over Sous: when a voice
 * turn is mid-reply (e.g. Gemini's "Let me find some recipes" that navigated here), wait
 * for it to finish. Gives up if the user starts talking, the session ends, or after
 * `maxWaitMs`. Returns a cancel function (call it on unmount).
 */
export function sayWhenFree(text: string, onSpoken?: () => void, maxWaitMs = 15_000): () => void {
  const isFree = (s: { status: string; paused: boolean }) => s.status === "idle" && !s.paused;
  const say = () => {
    onSpoken?.();
    sayIfSession(text);
  };

  const v = useVoice.getState();
  if (!v.sessionActive) return noop;
  if (isFree(v)) {
    say();
    return noop;
  }

  let done = false;
  let unsubscribe = noop;
  const timer = setTimeout(() => cancel(), maxWaitMs);
  const cancel = () => {
    done = true;
    unsubscribe();
    clearTimeout(timer);
  };
  unsubscribe = useVoice.subscribe((s) => {
    if (done) return;
    if (!s.sessionActive || s.status === "listening") cancel();
    else if (isFree(s)) {
      cancel();
      say();
    }
  });
  return cancel;
}

/** Announce suggestions once per ingredient set (not again on back-navigation). */
let announcedKey: string | null = null;
export function announceMatches(key: string, matches: RecipeMatch[]): () => void {
  if (!key || announcedKey === key) return noop;
  return sayWhenFree(recipesLine(matches), () => {
    announcedKey = key;
  });
}

/** Synchronous recipe lookup (cooking -> suggestions -> bundled cache), no network. */
export function peekRecipe(id: number): Recipe | null {
  const k = useKitchen.getState();
  if (k.activeRecipe?.id === id) return k.activeRecipe;
  const fromMatches = k.matches.find((m) => m.recipe.id === id)?.recipe;
  if (fromMatches?.steps.length) return fromMatches;
  return getCachedRecipe(id) ?? null;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Clipboard with a legacy fallback (navigator.clipboard is missing on plain-http LAN demos). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permission denied: try the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Rewrite the current history entry's query without navigating (Next syncs this with
 * useSearchParams). Used so Back from /ai/recipes returns to the chips, not the camera.
 */
export function replaceQuery(query: string): void {
  try {
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", url);
  } catch {
    /* history API unavailable: cosmetic only */
  }
}
