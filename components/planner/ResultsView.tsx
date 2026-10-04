"use client";

import { SearchX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FallbackNote, EmptyState } from "@/components/ui/Misc";
import { SPOONACULAR_BACKLINK } from "@/lib/config";
import type { PlannerResult } from "@/lib/planner/client";
import { usePopularRecipes } from "@/lib/planner/hooks";
import { searchSuggestions } from "@/lib/planner/search";
import { ingredientMatches } from "@/lib/recipes/catalog";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PairingCard } from "./PairingCard";
import { PlannerSection } from "./PlannerSection";
import { FeatureCard, RecipeRow } from "./RecipeRow";
import { RecipeTile, TileGrid } from "./RecipeTile";
import { ResultsSkeleton } from "./Skeletons";

const COLLAPSED = 4;

type SectionId = "matches" | "combinations" | "similar";

const COLLAPSED_ALL: Record<SectionId, boolean> = { matches: false, combinations: false, similar: false };

/**
 * Search results in three calm sections. Each shows its first four and expands in place
 * (expansion resets for a new query). While the next query loads, the previous results stay
 * up, dimmed; skeletons only show when there is nothing to show yet.
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
  const [open, setOpen] = useState<{ query: string; sections: Record<SectionId, boolean> } | null>(null);
  const fridge = useKitchen((s) => s.ingredients);

  if (!result) return <ResultsSkeleton />;

  const { data, origin } = result;
  const query = data.query;
  const expanded = open?.query === query ? open.sections : COLLAPSED_ALL;
  const toggle = (id: SectionId) => setOpen({ query, sections: { ...expanded, [id]: !expanded[id] } });
  const visible = (id: SectionId, list: Recipe[]) => (expanded[id] ? list : list.slice(0, COLLAPSED));
  const total = new Set([...data.matches, ...data.combinations, ...data.similar].map((r) => r.id)).size;

  if (total === 0) {
    if (loading) return <ResultsSkeleton />;
    return <NoResults query={query} filtersActive={filtersActive} onOpen={onOpen} onQuery={onQuery} onClearFilters={onClearFilters} />;
  }

  const matches = visible("matches", data.matches);
  const combos = visible("combinations", data.combinations);
  const similar = visible("similar", data.similar);

  return (
    <div aria-busy={loading} className={cn("transition-opacity duration-300", loading && "pointer-events-none opacity-55")}>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 animate-fade-up">
        <p className="text-sm text-ink-soft">
          {total} {total === 1 ? "recipe" : "recipes"} for <span className="font-semibold text-ink">“{query}”</span>
        </p>
        <FallbackNote show={origin === "local"} />
        {data.source === "live" && (
          <a
            href={SPOONACULAR_BACKLINK}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-ink-faint underline-offset-2 hover:underline"
          >
            Fresh picks from Spoonacular
          </a>
        )}
      </div>

      {data.matches.length > 0 && (
        <PlannerSection
          id="matches"
          title="Matches"
          subtitle={`Best fits for “${query}”`}
          total={data.matches.length}
          expanded={expanded.matches}
          onToggle={data.matches.length > COLLAPSED ? () => toggle("matches") : undefined}
          className="mt-5"
        >
          <div className="flex flex-col gap-3">
            <FeatureCard recipe={matches[0]} badge="Top match" onOpen={onOpen} />
            {matches.slice(1).map((r, i) => (
              <RecipeRow key={r.id} recipe={r} index={i + 1} onOpen={onOpen} />
            ))}
          </div>
        </PlannerSection>
      )}

      {data.combinations.length > 0 && (
        <PlannerSection
          id="combinations"
          title="Combinations"
          subtitle={data.labels.combinations || undefined}
          total={data.combinations.length}
          expanded={expanded.combinations}
          onToggle={data.combinations.length > COLLAPSED ? () => toggle("combinations") : undefined}
        >
          <TileGrid
            items={combos}
            render={(r, i, wide) => {
              const pair = data.pairs[String(r.id)]?.[0];
              return (
                <PairingCard
                  key={r.id}
                  recipe={r}
                  anchor={data.anchor}
                  pair={pair}
                  fromFridge={pair ? fridge.some((f) => ingredientMatches(f, pair)) : false}
                  index={i}
                  wide={wide}
                  onOpen={onOpen}
                />
              );
            }}
          />
        </PlannerSection>
      )}

      {data.similar.length > 0 && (
        <PlannerSection
          id="similar"
          title="Similar"
          subtitle={data.labels.similar || undefined}
          total={data.similar.length}
          expanded={expanded.similar}
          onToggle={data.similar.length > COLLAPSED ? () => toggle("similar") : undefined}
        >
          <TileGrid
            items={similar}
            render={(r, i, wide) => <RecipeTile key={r.id} recipe={r} index={i} wide={wide} onOpen={onOpen} />}
          />
        </PlannerSection>
      )}
    </div>
  );
}

/** Nothing found: suggestion chips that are known to hit, plus a few popular recipes so it's never a dead end */
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
  return (
    <>
      <EmptyState
        className="mt-6 animate-fade-up pb-4"
        icon={<SearchX className="size-6" />}
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
                  className="inline-flex h-11 items-center rounded-pill bg-surface px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
        <PlannerSection id="meanwhile" title="Popular right now" subtitle="While you think it over" className="mt-4">
          <div className="flex flex-col gap-3">
            {popular.map((p, i) => (
              <RecipeRow key={p.recipe.id} recipe={p.recipe} index={i} onOpen={onOpen} />
            ))}
          </div>
        </PlannerSection>
      )}
    </>
  );
}
