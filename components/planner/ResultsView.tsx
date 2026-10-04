"use client";

import { useEffect, useMemo, useState } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { EmptyState, FallbackNote } from "@/components/ui/Misc";
import { fromSpoonacular, fromTheMealDB, SPOONACULAR_BACKLINK, THEMEALDB_URL } from "@/lib/config";
import type { PlannerResult } from "@/lib/planner/client";
import { usePopularRecipes } from "@/lib/planner/hooks";
import {
  combinationGroups,
  hasIngredient,
  relatedIngredients,
  searchSuggestions,
  type ComboGroup,
} from "@/lib/planner/search";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { rememberShownRecipes } from "@/lib/voice/context";
import { usePersona } from "@/lib/voice/persona";
import { PlannerSection, Scroller } from "./PlannerSection";
import { RecipeRow } from "./RecipeRow";
import { ComboCard, CutChip } from "./ResultCards";
import { ResultsSkeleton } from "./Skeletons";

const ROWS_COLLAPSED = 4;
const CUTS_COLLAPSED = 4;
const COMBOS_COLLAPSED = 3;

type SectionId = "cuts" | "combinations" | "similar";

/**
 * Figma 2.2 search results: "Cuts" (tap one to narrow everything below to it; titled
 * "Ingredients" when the chips go beyond forms of the query ingredient), "Combinations" (query
 * ingredient + a partner, tap to search the pair) and "Similar" (every recipe that fits, best
 * matches first). While the next query loads the previous results stay up, dimmed; skeletons
 * only show when there is nothing to show yet.
 */
export function ResultsView({
  result,
  loading,
  filtersActive,
  onOpen,
  onQuery,
  onClearFilters,
}: {
  /** Current result, or the previous one while the next loads */
  result: PlannerResult | null;
  loading: boolean;
  filtersActive: boolean;
  onOpen: (recipe: Recipe) => void;
  onQuery: (query: string) => void;
  onClearFilters: () => void;
}) {
  // Per-query UI state: the selected cut and which sections are open reset for a new query.
  const [ui, setUi] = useState<{ query: string; cut: string | null; open: Record<SectionId, boolean> } | null>(null);
  const data = result?.data;
  const query = data?.query ?? "";
  const state = ui?.query === query ? ui : { query, cut: null, open: { cuts: false, combinations: false, similar: false } };
  const cut = state.cut;

  const all = useMemo(() => {
    if (!data) return [];
    const seen = new Set<number>();
    return [...data.matches, ...data.similar].filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
  }, [data]);
  const cuts = useMemo(
    () => (data ? relatedIngredients(data.query, [...data.matches, ...data.combinations]) : []),
    [data],
  );
  // Sous can start any recipe on screen by name ("let's do the teriyaki one").
  useEffect(() => {
    if (all.length) rememberShownRecipes(all);
  }, [all]);

  if (!result || !data) return <ResultsSkeleton />;

  const keep = cut ? (r: Recipe) => hasIngredient(r, cut) : undefined;
  const combos = combinationGroups(data, keep);
  const rows = keep ? all.filter(keep) : all;
  const listed = [...data.matches, ...data.combinations, ...data.similar];
  const total = new Set(listed.map((r) => r.id)).size;
  const shown = cut ? new Set([...rows, ...combos.flatMap((g) => g.recipes)].map((r) => r.id)).size : total;

  if (total === 0) {
    if (loading) return <ResultsSkeleton />;
    return <NoResults query={query} filtersActive={filtersActive} onOpen={onOpen} onQuery={onQuery} onClearFilters={onClearFilters} />;
  }

  // "Cuts" when every chip is a form of the query ingredient ("beef" -> ground beef, steak…);
  // otherwise they include what the results are made of ("thai" -> chicken, rice noodles…).
  const cutsTitle = cuts.every((c) => c.direct) ? "Cuts" : "Ingredients";
  const toggle = (id: SectionId) => setUi({ ...state, open: { ...state.open, [id]: !state.open[id] } });
  const pickCut = (key: string) => setUi({ ...state, cut: cut === key ? null : key });
  const openCombo = (group: ComboGroup) => {
    if (group.recipes.length === 1) onOpen(group.recipes[0]);
    else onQuery(group.query);
  };

  return (
    <div aria-busy={loading} className={cn("transition-opacity duration-300", loading && "pointer-events-none opacity-55")}>
      {cuts.length > 0 && (
        <PlannerSection
          id="cuts"
          title={cutsTitle}
          top="pt-5"
          expanded={state.open.cuts}
          onToggle={cuts.length > CUTS_COLLAPSED ? () => toggle("cuts") : undefined}
        >
          <Scroller label={cutsTitle} wrap={state.open.cuts} gap="gap-2">
            {cuts.map((c, i) => (
              <CutChip key={c.key} chip={c} index={i} selected={cut === c.key} onClick={() => pickCut(c.key)} />
            ))}
          </Scroller>
        </PlannerSection>
      )}

      {combos.length > 0 && (
        <PlannerSection
          id="combinations"
          title="Combinations"
          expanded={state.open.combinations}
          onToggle={combos.length > COMBOS_COLLAPSED ? () => toggle("combinations") : undefined}
        >
          <Scroller label="Combinations" wrap={state.open.combinations} gap="gap-2.5">
            {combos.map((g, i) => (
              <ComboCard key={g.key} group={g} index={i} onClick={() => openCombo(g)} />
            ))}
          </Scroller>
        </PlannerSection>
      )}

      {rows.length > 0 && (
        <PlannerSection
          id="similar"
          title="Similar"
          gap="mt-2.5"
          expanded={state.open.similar}
          onToggle={rows.length > ROWS_COLLAPSED ? () => toggle("similar") : undefined}
        >
          <div className="flex flex-col gap-2.5">
            {(state.open.similar ? rows : rows.slice(0, ROWS_COLLAPSED)).map((r, i) => (
              <RecipeRow key={r.id} recipe={r} index={i} onOpen={onOpen} />
            ))}
          </div>
        </PlannerSection>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 px-5">
        <p className="text-xs text-ink-soft">
          {shown} {shown === 1 ? "recipe" : "recipes"} for <span className="font-semibold text-ink">“{query}”</span>
          {cut && <> with {cut}</>}
        </p>
        <FallbackNote show={result.origin === "local"} />
        {data.source === "live" && (listed.some(fromSpoonacular) || !listed.some(fromTheMealDB)) && (
          <a
            href={SPOONACULAR_BACKLINK}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink-faint underline-offset-2 hover:underline"
          >
            Fresh picks from Spoonacular
          </a>
        )}
        {listed.some(fromTheMealDB) && (
          <a
            href={THEMEALDB_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink-faint underline-offset-2 hover:underline"
          >
            Recipes and photos from TheMealDB
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Nothing found: the sous-chef (design rules v1: mascots in empty states), suggestion chips
 * that are known to hit, plus a few popular recipes so it's never a dead end.
 */
function NoResults({
  query,
  filtersActive,
  onOpen,
  onQuery,
  onClearFilters,
}: {
  query: string;
  filtersActive: boolean;
  onOpen: (recipe: Recipe) => void;
  onQuery: (query: string) => void;
  onClearFilters: () => void;
}) {
  const popular = usePopularRecipes(3);
  const persona = usePersona();
  return (
    <>
      <EmptyState
        className="mt-2 animate-fade-up pb-2"
        icon={<MascotAvatar persona={persona} size={56} />}
        title={`Nothing for “${query}” yet`}
        body={filtersActive ? "Try removing a filter, or search for one of these." : "Try an ingredient you have, or one of these."}
        action={
          <div className="mt-1 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {searchSuggestions().map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onQuery(s)}
                  className="inline-flex items-center rounded-pill border border-line bg-surface px-3 py-1.5 text-meta font-medium text-ink transition hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {s}
                </button>
              ))}
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" className="h-11" onClick={onClearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        }
      />
      {popular.length > 0 && (
        <PlannerSection id="meanwhile" title="Popular right now" gap="mt-2.5">
          <div className="flex flex-col gap-2.5">
            {popular.map((p, i) => (
              <RecipeRow key={p.recipe.id} recipe={p.recipe} index={i} onOpen={onOpen} />
            ))}
          </div>
        </PlannerSection>
      )}
    </>
  );
}
