"use client";

import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { filtersTitle } from "@/lib/planner/format";
import { usePopularityMap } from "@/lib/planner/hooks";
import { applyFilters, type SearchFilters } from "@/lib/planner/search";
import { getCatalog } from "@/lib/recipes/catalog";
import type { Recipe } from "@/lib/types";
import { PlannerSection } from "./PlannerSection";
import { RecipeTile, TileGrid } from "./RecipeTile";

/** Filters on, no query: every catalog recipe that fits, most popular first */
export function FilteredView({
  filters,
  onOpen,
  onClear,
}: {
  filters: SearchFilters;
  onOpen: (recipe: Recipe) => void;
  onClear: () => void;
}) {
  const popularity = usePopularityMap();
  const recipes = useMemo(
    () =>
      applyFilters(getCatalog(), filters).sort(
        (a, b) => (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0) || a.readyInMinutes - b.readyInMinutes,
      ),
    [filters, popularity],
  );

  if (!recipes.length) {
    return (
      <EmptyState
        className="mt-6 animate-fade-up"
        icon={<SlidersHorizontal className="size-6" />}
        title="Nothing fits those filters yet"
        body="Loosen a filter, or search for something specific."
        action={
          <Button variant="soft" size="sm" className="h-11" onClick={onClear}>
            Clear filters
          </Button>
        }
      />
    );
  }

  return (
    <PlannerSection
      id="filtered"
      title={filtersTitle(filters)}
      subtitle={`${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}, most popular first`}
      className="mt-8"
    >
      <TileGrid items={recipes} render={(r, i, wide) => <RecipeTile key={r.id} recipe={r} index={i} wide={wide} onOpen={onOpen} />} />
    </PlannerSection>
  );
}
