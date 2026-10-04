"use client";

/**
 * The Planner tab (Figma 2.1 planner / 2.2 search · "beef"): browse, search and plan the week
 * without talking, or search by voice from the mic in the search pill.
 *   Browse (empty query): title + filter, search pill, chips, Most popular, Recently made,
 *                         then This week (the plan, below the design's fold).
 *   Search (a query):     back + search pill, the sous-chef's listening banner while the mic
 *                         is open, Cuts, Combinations, Similar (server search, on-device fallback).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { knownRecipe, resolveRecipe } from "@/lib/planner/client";
import { dayPhrase, hasFilters } from "@/lib/planner/format";
import { MIN_QUERY, usePlannerSearch, usePopularityMap, useSearchInput, type PlanDay, type RecentItem } from "@/lib/planner/hooks";
import { normalizeQuery, type SearchFilters } from "@/lib/planner/search";
import { usePlannerSession } from "@/lib/planner/session";
import { useVoiceSearch } from "@/lib/planner/voice";
import { toast } from "@/lib/stores/toast";
import type { ISODate, Recipe } from "@/lib/types";
import { setFocusRecipe } from "@/lib/voice/context";
import { BrowseView } from "./BrowseView";
import { ActiveFilters, DietPanel, FilterChips } from "./FilterChips";
import { FilteredView } from "./FilteredView";
import { ListeningBanner, PlannerHeader } from "./PlannerHeader";
import { PlanTargetBanner } from "./PlanTargetBanner";
import { RecipeSheet } from "./RecipeSheet";
import { ResultsView } from "./ResultsView";
import { SearchBar } from "./SearchBar";

const DEBOUNCE_MS = 300;

function scrollToTop() {
  document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
}

export function MealPlanner({ initialQuery }: { initialQuery?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remember = usePlannerSession((s) => s.remember);
  // Restores the last search + filters when coming back from "Cook this" (in-memory only).
  // A ?q= link (e.g. the old /ai/plan?q=…) wins over the remembered query.
  const [initial] = useState(() => {
    const session = usePlannerSession.getState();
    return { query: initialQuery?.trim() ? initialQuery.trim() : session.query, filters: session.filters };
  });

  // The ?q= did its job; drop it so a reload or the tab doesn't jump back into that search.
  useEffect(() => {
    if (!initialQuery) return;
    usePlannerSession.getState().remember({ query: initialQuery.trim() });
    const url = new URL(window.location.href);
    url.searchParams.delete("q");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialQuery]);

  // Typing is debounced; Enter, a chip, voice or the clear button applies immediately.
  const { input, query: rawQuery, type, commit } = useSearchInput(initial.query, DEBOUNCE_MS);
  const query = normalizeQuery(rawQuery);
  const [filters, setFilters] = useState<SearchFilters>(initial.filters);
  const [dietOpen, setDietOpen] = useState(false);

  const [selected, setSelected] = useState<Recipe | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [planTarget, setPlanTarget] = useState<ISODate | null>(null);

  const popularity = usePopularityMap();
  const searching = query.length >= MIN_QUERY;
  const { result, loading, previous } = usePlannerSearch(query, filters);
  const filtered = hasFilters(filters);

  /** Show the search layout as soon as there is something to search (not after the debounce) */
  const searchMode = normalizeQuery(input).length >= MIN_QUERY;

  function applyQuery(value: string) {
    commit(value);
    remember({ query: value });
  }

  const voice = useVoiceSearch({
    onResult: (text) => {
      applyQuery(text);
      scrollToTop();
    },
    onFallback: () => inputRef.current?.focus(),
  });

  function changeInput(value: string) {
    voice.cancel();
    type(value);
    remember({ query: value });
  }

  function clearInput() {
    voice.cancel();
    applyQuery("");
  }

  function leaveSearch() {
    clearInput();
    inputRef.current?.blur();
    scrollToTop();
  }

  function searchFor(value: string) {
    applyQuery(value);
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
    // "Let's do this one" now means this recipe.
    setFocusRecipe(recipe);
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

  // While the mic listens, the words heard so far show in the field.
  const shownInput = voice.listening && voice.interim ? voice.interim : input;

  return (
    <div className="pb-nav">
      {!searchMode && (
        <PlannerHeader
          filtersOpen={dietOpen}
          filtersActive={filters.diet != null}
          onFilters={() => setDietOpen((o) => !o)}
        />
      )}

      <div className={searchMode ? "flex items-center gap-2 px-5 pt-[calc(var(--safe-top)+6px)]" : "flex items-center px-5 pt-4"}>
        {searchMode && (
          // Figma: a bare 22px chevron, 8px from the pill; the ::after keeps a 46px tap target.
          <button
            type="button"
            onClick={leaveSearch}
            aria-label="Back to the planner"
            className="relative inline-flex size-[22px] shrink-0 items-center justify-center rounded-full transition after:absolute after:-inset-3 after:content-[''] hover:opacity-70 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-pop"
          >
            <img src="/figma/v2/2014-1069/icon-chev-l.svg" alt="" width={22} height={22} className="block size-[22px]" />
          </button>
        )}
        <SearchBar
          value={shownInput}
          onChange={changeInput}
          onSubmit={() => applyQuery(input)}
          onClear={clearInput}
          onMic={voice.toggle}
          active={searchMode}
          listening={voice.listening}
          busy={searching && loading}
          inputRef={inputRef}
        />
      </div>

      {voice.listening && <ListeningBanner className="mx-5 mt-3" />}

      {searchMode ? (
        <>
          <ActiveFilters filters={filters} onFilters={changeFilters} className="pt-3" />
          {planTarget && <PlanTargetBanner date={planTarget} onCancel={() => setPlanTarget(null)} className="mx-5 mt-3" />}
          {/* Until the typing settles, the last results stay up (dimmed) */}
          <ResultsView
            result={searching ? (result ?? previous) : previous}
            loading={searching ? loading : true}
            filtersActive={filtered}
            onOpen={openRecipe}
            onQuery={searchFor}
            onClearFilters={() => changeFilters({})}
          />
        </>
      ) : (
        <>
          <FilterChips filters={filters} onFilters={changeFilters} className="pt-3" />
          {dietOpen && <DietPanel filters={filters} onFilters={changeFilters} className="pt-3" />}
          {filtered ? (
            <>
              {planTarget && <PlanTargetBanner date={planTarget} onCancel={() => setPlanTarget(null)} className="mx-5 mt-3" />}
              <FilteredView filters={filters} onOpen={openRecipe} onClear={() => changeFilters({})} />
            </>
          ) : (
            <BrowseView
              planTarget={planTarget}
              busyId={busyId}
              onDay={openDay}
              onCancelTarget={() => setPlanTarget(null)}
              onOpen={openRecipe}
              onOpenRecent={openRecent}
            />
          )}
        </>
      )}

      <RecipeSheet
        recipe={selected}
        upvotes={selected ? (popularity.get(selected.id) ?? 0) : 0}
        planTarget={planTarget}
        onPlanned={handlePlanned}
        onClose={closeSheet}
      />
    </div>
  );
}
