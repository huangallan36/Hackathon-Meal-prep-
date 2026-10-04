"use client";

/**
 * Meal planner ("Read mode"): browse, search and plan the week without talking.
 * Empty query -> This week, Most Popular, Recently Made, Quick weeknight, cuisines.
 * With a query -> Matches, Combinations, Similar (server search, on-device fallback).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { BrowseView } from "@/components/planner/BrowseView";
import { FilterChips } from "@/components/planner/FilterChips";
import { FilteredView } from "@/components/planner/FilteredView";
import { PlanTargetBanner } from "@/components/planner/PlanTargetBanner";
import { RecipeSheet } from "@/components/planner/RecipeSheet";
import { ResultsView } from "@/components/planner/ResultsView";
import { SearchBar } from "@/components/planner/SearchBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { knownRecipe, resolveRecipe } from "@/lib/planner/client";
import { dayPhrase, hasFilters } from "@/lib/planner/format";
import {
  MIN_QUERY,
  usePlannerSearch,
  usePopularityMap,
  useSearchInput,
  type PlanDay,
  type RecentItem,
} from "@/lib/planner/hooks";
import { hasResults, normalizeQuery, searchSuggestions, type SearchFilters } from "@/lib/planner/search";
import { usePlannerSession } from "@/lib/planner/session";
import { toast } from "@/lib/stores/toast";
import type { ISODate, Recipe } from "@/lib/types";

const DEBOUNCE_MS = 300;
const QUERY_CHIP_CANDIDATES = ["Chicken", "Pasta", "Salmon", "Rice", "Eggs", "Beef", "Tofu", "Soup", "Salad"];

/** Ingredient chips that are guaranteed to find something in the bundled catalog */
function queryChips(): string[] {
  const hits = QUERY_CHIP_CANDIDATES.filter((c) => hasResults(c));
  const extra = searchSuggestions(undefined, 6).filter((s) => !hits.includes(s));
  return [...hits, ...extra].slice(0, 6);
}

function scrollToTop() {
  document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
}

export default function MealPlannerPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const remember = usePlannerSession((s) => s.remember);
  // Restores the last search + filters when coming back from "Cook this" (in-memory only).
  const [initial] = useState(() => usePlannerSession.getState());

  // Typing is debounced; Enter, a chip or the clear button applies immediately.
  const { input, query: rawQuery, type, commit } = useSearchInput(initial.query, DEBOUNCE_MS);
  const query = normalizeQuery(rawQuery);
  const [filters, setFilters] = useState<SearchFilters>(initial.filters);

  const [selected, setSelected] = useState<Recipe | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [planTarget, setPlanTarget] = useState<ISODate | null>(null);

  const chips = useMemo(() => queryChips(), []);
  const popularity = usePopularityMap();
  const searching = query.length >= MIN_QUERY;
  const { result, loading, previous } = usePlannerSearch(query, filters);
  const filtered = hasFilters(filters);

  function changeInput(value: string) {
    type(value);
    remember({ query: value });
  }

  function clearInput() {
    commit("");
    remember({ query: "" });
  }

  function searchFor(value: string) {
    commit(value);
    remember({ query: value });
    scrollToTop();
  }

  function changeFilters(next: SearchFilters) {
    setFilters(next);
    remember({ filters: next });
  }

  const closeSheet = useCallback(() => setSelected(null), []);
  /** Latest recipe id being fetched, so a slow answer can't replace a newer tap */
  const pendingId = useRef<number | null>(null);

  async function openId(id: number) {
    const known = knownRecipe(id);
    if (known) {
      pendingId.current = null;
      setSelected(known);
      return;
    }
    pendingId.current = id;
    setBusyId(id);
    const recipe = await resolveRecipe(id);
    if (pendingId.current !== id) return;
    pendingId.current = null;
    setBusyId(null);
    if (recipe) setSelected(recipe);
    else toast("Couldn't open that recipe right now. Try again in a bit?", "warning");
  }

  function openRecipe(recipe: Recipe) {
    pendingId.current = null;
    setBusyId(null);
    setSelected(recipe);
  }

  function openRecent(item: RecentItem) {
    if (item.recipe) openRecipe(item.recipe);
    else void openId(item.id);
  }

  function openDay(day: PlanDay) {
    if (day.meals.length) {
      void openId(day.meals[0].recipeId);
      return;
    }
    setPlanTarget((t) => (t === day.date ? null : day.date));
  }

  function handlePlanned(date: ISODate, added: boolean) {
    toast(added ? `Planned for ${dayPhrase(date)}` : `Removed from ${dayPhrase(date)}`, added ? "success" : "default");
    if (added && date === planTarget) {
      setPlanTarget(null);
      setSelected(null);
    }
  }

  return (
    <>
      <ScreenHeader title="Meal planner" subtitle="Browse and plan without talking" back="/ai" />

      <div className="px-5 pb-nav">
        <SearchBar
          value={input}
          onChange={changeInput}
          onSubmit={() => commit(input)}
          onClear={clearInput}
          busy={searching && loading}
          inputRef={inputRef}
          className="mt-1 animate-fade-up"
        />
        <FilterChips filters={filters} onFilters={changeFilters} queryChips={chips} activeQuery={query} onQuery={searchFor} />
        {planTarget && (searching || filtered) && (
          <PlanTargetBanner date={planTarget} onCancel={() => setPlanTarget(null)} className="mt-3" />
        )}

        {searching ? (
          <ResultsView
            result={result ?? previous}
            loading={loading}
            filtersActive={filtered}
            onOpen={openRecipe}
            onQuery={searchFor}
            onClearFilters={() => changeFilters({})}
          />
        ) : filtered ? (
          <FilteredView filters={filters} onOpen={openRecipe} onClear={() => changeFilters({})} />
        ) : (
          <BrowseView
            planTarget={planTarget}
            busyId={busyId}
            onDay={openDay}
            onCancelTarget={() => setPlanTarget(null)}
            onOpen={openRecipe}
            onOpenRecent={openRecent}
            onQuery={searchFor}
          />
        )}
      </div>

      <RecipeSheet
        recipe={selected}
        upvotes={selected ? (popularity.get(selected.id) ?? 0) : 0}
        planTarget={planTarget}
        onPlanned={handlePlanned}
        onClose={closeSheet}
      />
    </>
  );
}
