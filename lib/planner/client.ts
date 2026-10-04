"use client";

/**
 * Client side of the meal planner: search with an offline fallback, a small registry of
 * every recipe the planner has seen (so live results stay openable), and "Cook this".
 */
import { TIMEOUTS } from "@/lib/config";
import { fetchJSON } from "@/lib/http";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";
import { searchRecipes, toSearchParams, type PlannerSearchResponse, type SearchOptions } from "./search";

export interface PlannerResult {
  data: PlannerSearchResponse;
  /** "local" = the request failed and the bundled catalog answered on-device */
  origin: "server" | "local";
}

/* ------------------------------------------------------------------ */
/* Recipe registry                                                     */
/* ------------------------------------------------------------------ */

const seen = new Map<number, Recipe>();

function remember(recipes: Recipe[]) {
  for (const r of recipes) if (r.steps.length) seen.set(r.id, r);
}

/** Best full recipe we already hold for an id, without touching the network */
export function knownRecipe(id: number): Recipe | undefined {
  const k = useKitchen.getState();
  return (
    getCachedRecipe(id) ??
    seen.get(id) ??
    (k.activeRecipe?.id === id ? k.activeRecipe : undefined) ??
    k.matches.find((m) => m.recipe.id === id)?.recipe
  );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

const memo = new Map<string, PlannerResult>();
const MEMO_MAX = 40;

export function searchKey(query: string, options: SearchOptions = {}): string {
  return toSearchParams(query, options).toString();
}

/** A server result fetched earlier this session (instant back/forth between queries) */
export function peekSearch(key: string): PlannerResult | undefined {
  return memo.get(key);
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<Recipe>;
  return (
    Number.isSafeInteger(r.id) &&
    typeof r.title === "string" &&
    typeof r.image === "string" &&
    Array.isArray(r.ingredients) &&
    Array.isArray(r.steps) &&
    r.steps.length > 0 &&
    Array.isArray(r.cuisines) &&
    Array.isArray(r.dishTypes) &&
    Array.isArray(r.diets)
  );
}

function sanitize(res: unknown, fallbackQuery: string): PlannerSearchResponse {
  if (!res || typeof res !== "object") throw new Error("bad search response");
  const r = res as Partial<PlannerSearchResponse>;
  if (!Array.isArray(r.matches)) throw new Error("bad search response");
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecipe) : []);
  return {
    query: typeof r.query === "string" ? r.query : fallbackQuery,
    matches: list(r.matches),
    combinations: list(r.combinations),
    similar: list(r.similar),
    source: r.source === "live" ? "live" : "cache",
    labels: {
      combinations: typeof r.labels?.combinations === "string" ? r.labels.combinations : "",
      similar: typeof r.labels?.similar === "string" ? r.labels.similar : "",
    },
    anchor: typeof r.anchor === "string" ? r.anchor : null,
    pairs: r.pairs && typeof r.pairs === "object" ? r.pairs : {},
  };
}

/**
 * GET /api/recipes/search, falling back to the same search run on the bundled catalog.
 * Never rejects.
 */
export async function fetchPlannerSearch(query: string, options: SearchOptions, signal?: AbortSignal): Promise<PlannerResult> {
  const key = searchKey(query, options);
  const cached = memo.get(key);
  if (cached) return cached;
  try {
    const res = await fetchJSON<unknown>(`/api/recipes/search?${key}`, { timeoutMs: TIMEOUTS.recipes, signal });
    const data = sanitize(res, query);
    const result: PlannerResult = { data, origin: "server" };
    remember([...data.matches, ...data.combinations, ...data.similar]);
    if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value ?? "");
    memo.set(key, result);
    return result;
  } catch {
    return { data: searchRecipes(query, options), origin: "local" };
  }
}

/* ------------------------------------------------------------------ */
/* Cook this                                                           */
/* ------------------------------------------------------------------ */

/**
 * Hand-off to cooking mode: loadRecipe -> startCooking -> /ai/cook/{id}.
 * A full recipe already in hand (catalog, a live search result) skips the network, so
 * "Cook this" is instant even offline. Returns false (after a toast) if nothing is cookable.
 */
export async function cookRecipe(recipe: Pick<Recipe, "id"> & Partial<Recipe>, push: (href: string) => void): Promise<boolean> {
  let full: Recipe | null = knownRecipe(recipe.id) ?? (isRecipe(recipe) ? recipe : null);
  if (!full) {
    try {
      full = await loadRecipe(recipe.id);
    } catch {
      full = null;
    }
  }
  if (!full?.steps.length) {
    toast("Couldn't load that recipe right now. Try again in a bit?", "warning");
    return false;
  }
  useKitchen.getState().startCooking(full);
  push(`/ai/cook/${full.id}`);
  return true;
}

/** Resolve a recipe for the detail sheet: memory first, then the network. Null if unavailable. */
export async function resolveRecipe(id: number): Promise<Recipe | null> {
  const known = knownRecipe(id);
  if (known) return known;
  try {
    const r = await loadRecipe(id);
    if (r?.steps.length) {
      remember([r]);
      return r;
    }
  } catch {
    /* fall through */
  }
  return null;
}
