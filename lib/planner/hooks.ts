"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCatalog } from "@/lib/recipes/catalog";
import { useDiary } from "@/lib/stores/diary";
import { useKitchen } from "@/lib/stores/kitchen";
import { recipePopularity, useSocial } from "@/lib/stores/social";
import type { ISODate, Recipe } from "@/lib/types";
import { addDays, formatDay, fromISODate, todayISO } from "@/lib/utils";
import { fetchPlannerSearch, knownRecipe, peekSearch, searchKey, type PlannerResult } from "./client";
import { normalizeQuery, type SearchFilters } from "./search";
import { avoidedByUser, proteinOf } from "./profile";
import { plannedOn, usePlanner, type PlannedMeal } from "./store";

/** Queries shorter than this browse instead of searching */
export const MIN_QUERY = 2;

/**
 * Search box state. `input` follows every keystroke; `query` settles `ms` after typing stops.
 * `commit` (Enter, a chip, the clear button) applies a value at once and cancels the pending
 * update, so a stale debounced value can never flash up after a clear or a chip tap.
 */
export function useSearchInput(
  initial: string,
  ms: number,
): { input: string; query: string; type: (value: string) => void; commit: (value: string) => void } {
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const type = useCallback(
    (value: string) => {
      setInput(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        setQuery(value);
      }, ms);
    },
    [ms],
  );

  const commit = useCallback((value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setInput(value);
    setQuery(value);
  }, []);

  return { input, query, type, commit };
}

/**
 * Server search with the on-device fallback. Loading is derived (no state for it): a key
 * without a result yet is loading. Stale requests are aborted when the query changes.
 * `previous` is the last result shown, so the screen can keep it up (dimmed) while typing.
 */
export function usePlannerSearch(
  query: string,
  filters: SearchFilters,
): { result: PlannerResult | null; loading: boolean; previous: PlannerResult | null } {
  const have = useKitchen((s) => s.ingredients);
  const haveKey = have.join(",");
  const q = normalizeQuery(query);
  const { maxMinutes, diet, highProtein, leftovers } = filters;
  const key = q.length >= MIN_QUERY ? searchKey(q, { maxMinutes, diet, highProtein, leftovers, have }) : "";
  const [state, setState] = useState<{ key: string; result: PlannerResult } | null>(null);

  useEffect(() => {
    if (!key || peekSearch(key)) return;
    const ctrl = new AbortController();
    const options = { maxMinutes, diet, highProtein, leftovers, have: haveKey ? haveKey.split(",") : [] };
    void fetchPlannerSearch(q, options, ctrl.signal).then((result) => {
      if (!ctrl.signal.aborted) setState({ key, result });
    });
    return () => ctrl.abort();
  }, [key, q, maxMinutes, diet, highProtein, leftovers, haveKey]);

  const result = !key ? null : state?.key === key ? state.result : (peekSearch(key) ?? null);
  return { result, loading: Boolean(key) && !result, previous: state?.result ?? null };
}

export interface PopularRecipe {
  recipe: Recipe;
  /** Total upvotes across Social posts of this recipe (0 = filler from the catalog) */
  upvotes: number;
}

/**
 * "Most popular": recipes ranked by Social upvotes (high-protein first on ties), topped up from
 * the catalog so it never looks empty. Tuned to the user (FOR_YOU): what they avoid is left out.
 */
export function usePopularRecipes(limit = 10): PopularRecipe[] {
  const posts = useSocial((s) => s.posts);
  const myUpvotes = useSocial((s) => s.myUpvotes);
  return useMemo(() => {
    const ranked: PopularRecipe[] = [];
    for (const [id, upvotes] of recipePopularity(posts, myUpvotes)) {
      const recipe = knownRecipe(id);
      if (recipe && !avoidedByUser(recipe)) ranked.push({ recipe, upvotes });
    }
    ranked.sort((a, b) => b.upvotes - a.upvotes || proteinOf(b.recipe) - proteinOf(a.recipe));
    if (ranked.length < 4) {
      const have = new Set(ranked.map((r) => r.recipe.id));
      const filler = getCatalog()
        .filter((r) => !have.has(r.id) && !avoidedByUser(r))
        .sort((a, b) => proteinOf(b) - proteinOf(a));
      for (const recipe of filler) ranked.push({ recipe, upvotes: 0 });
    }
    return ranked.slice(0, limit);
  }, [posts, myUpvotes, limit]);
}

/** Map of recipeId -> upvotes, for badges on any card */
export function usePopularityMap(): Map<number, number> {
  const posts = useSocial((s) => s.posts);
  const myUpvotes = useSocial((s) => s.myUpvotes);
  return useMemo(() => recipePopularity(posts, myUpvotes), [posts, myUpvotes]);
}

export interface RecentItem {
  id: number;
  title: string;
  image?: string;
  /** Full recipe when we already hold it (otherwise it loads on tap) */
  recipe?: Recipe;
  /** Diary log time, when it was logged */
  loggedAt?: number;
}

/** "Recently Made": finished cooks (most recent first) plus diary entries that came from a recipe */
export function useRecentRecipes(limit = 10): RecentItem[] {
  const recentIds = useKitchen((s) => s.recentRecipeIds);
  const activeRecipe = useKitchen((s) => s.activeRecipe);
  const matches = useKitchen((s) => s.matches);
  const entries = useDiary((s) => s.entries);
  return useMemo(() => {
    const logged = new Map<number, { name: string; image?: string; loggedAt: number }>();
    for (const e of entries) {
      if (e.recipeId == null) continue;
      const prev = logged.get(e.recipeId);
      if (!prev || e.loggedAt > prev.loggedAt) logged.set(e.recipeId, { name: e.name, image: e.image, loggedAt: e.loggedAt });
    }
    const byLogTime = [...logged.entries()].sort((a, b) => b[1].loggedAt - a[1].loggedAt).map(([id]) => id);
    const ids = [...new Set([...recentIds, ...byLogTime])];

    const out: RecentItem[] = [];
    for (const id of ids) {
      const recipe =
        (activeRecipe?.id === id ? activeRecipe : undefined) ??
        matches.find((m) => m.recipe.id === id)?.recipe ??
        knownRecipe(id);
      const log = logged.get(id);
      if (!recipe && !log) continue;
      out.push({
        id,
        title: recipe?.title ?? log?.name ?? "A recent dish",
        image: recipe?.image ?? log?.image,
        recipe,
        loggedAt: log?.loggedAt,
      });
      if (out.length >= limit) break;
    }
    return out;
  }, [recentIds, entries, activeRecipe, matches, limit]);
}

export interface PlanDay {
  date: ISODate;
  /** "Today", then weekday names ("Sun", "Mon") */
  label: string;
  /** "Mon", "Tue" (always the weekday) */
  weekday: string;
  dayOfMonth: number;
  meals: PlannedMeal[];
}

/** The next seven days with whatever is planned on each */
export function useWeekPlan(): PlanDay[] {
  const plan = usePlanner((s) => s.plan);
  return useMemo(() => {
    const today = todayISO();
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      const weekday = formatDay(date, { weekday: "short" });
      return {
        date,
        label: i === 0 ? "Today" : weekday,
        weekday,
        dayOfMonth: fromISODate(date).getDate(),
        meals: plannedOn(plan, date),
      };
    });
  }, [plan]);
}
