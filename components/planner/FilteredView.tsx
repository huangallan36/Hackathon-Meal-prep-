"use client";

import { useMemo, useState } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { filtersTitle } from "@/lib/planner/format";
import { usePopularityMap } from "@/lib/planner/hooks";
import { applyFilters, fridgeCount, type SearchFilters } from "@/lib/planner/search";
import { getCatalog } from "@/lib/recipes/catalog";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { usePersona } from "@/lib/voice/persona";
import { PlannerSection } from "./PlannerSection";
import { RecipeRow } from "./RecipeRow";

const COLLAPSED = 6;

/**
 * A chip filter on, no query: every catalog recipe that fits, as Figma "Similar" rows.
 * Leftovers first by how much of the fridge they use, otherwise most popular first.
 * Empty states show the chosen sous-chef (design rules v1).
 */
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
  const persona = usePersona();
  const fridge = useKitchen((s) => s.ingredients);
  const [open, setOpen] = useState(false);
  const recipes = useMemo(
    () =>
      applyFilters(getCatalog(), filters, fridge).sort(
        (a, b) =>
          (filters.leftovers ? fridgeCount(b, fridge) - fridgeCount(a, fridge) : 0) ||
          (popularity.get(b.id) ?? 0) - (popularity.get(a.id) ?? 0) ||
          a.readyInMinutes - b.readyInMinutes,
      ),
    [filters, fridge, popularity],
  );

  if (filters.leftovers && !fridge.length) {
    return (
      <EmptyState
        className="animate-fade-up"
        icon={<MascotAvatar persona={persona} size={56} />}
        title="What's in your fridge?"
        body={`Snap your fridge and ${persona.name} finds recipes that use it up.`}
        action={
          <ButtonLink href="/ai/fridge" variant="soft" size="sm" className="h-11">
            Snap my fridge
          </ButtonLink>
        }
      />
    );
  }

  if (!recipes.length) {
    return (
      <EmptyState
        className="animate-fade-up"
        icon={<MascotAvatar persona={persona} size={56} />}
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

  const shown = open ? recipes : recipes.slice(0, COLLAPSED);
  return (
    <PlannerSection
      id="filtered"
      title={filtersTitle(filters)}
      gap="mt-2.5"
      expanded={open}
      onToggle={recipes.length > COLLAPSED ? () => setOpen((o) => !o) : undefined}
    >
      <p className="-mt-1 mb-2.5 text-xs text-ink-soft">
        {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        {filters.leftovers ? ", most of your fridge first" : ", most popular first"}
      </p>
      <div className="flex flex-col gap-2.5">
        {shown.map((r, i) => (
          <RecipeRow key={r.id} recipe={r} index={i} onOpen={onOpen} />
        ))}
      </div>
    </PlannerSection>
  );
}
