"use client";

import { Camera, Refrigerator, SearchX, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { RecipeCard, RecipeCardSkeleton } from "@/components/kitchen/RecipeCard";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { EmptyState, FallbackNote } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SPOONACULAR_BACKLINK } from "@/lib/config";
import { announceMatches, fetchMatches } from "@/lib/kitchen/client";
import { ingredientSummary } from "@/lib/kitchen/format";
import { cookHref, FRIDGE_EDIT_HREF, FRIDGE_SCAN_HREF } from "@/lib/kitchen/routes";
import { getCatalog, matchRecipe } from "@/lib/recipes/catalog";
import { ingredientsKey, useKitchen } from "@/lib/stores/kitchen";
import { recipePopularity, useSocial } from "@/lib/stores/social";
import type { Recipe } from "@/lib/types";

export default function RecipesPage() {
  const router = useRouter();
  const ingredients = useKitchen((s) => s.ingredients);
  const matches = useKitchen((s) => s.matches);
  const matchesFor = useKitchen((s) => s.matchesFor);
  const matchesSource = useKitchen((s) => s.matchesSource);

  const key = ingredientsKey(ingredients);
  const hasIngredients = key !== "";
  const ready = hasIngredients && matchesFor === key;

  // Fetch when the stored suggestions are for a different fridge. fetchMatches never
  // rejects (it falls back to the bundled catalog) and writes the result to the store.
  useEffect(() => {
    if (hasIngredients && !ready) void fetchMatches(ingredients);
  }, [hasIngredients, ready, ingredients]);

  // One spoken summary per fridge, during a voice session, after Sous finishes its own line.
  useEffect(() => {
    if (!ready) return;
    return announceMatches(key, matches);
  }, [ready, key, matches]);

  function cook(recipe: Recipe) {
    useKitchen.getState().startCooking(recipe);
    router.push(cookHref(recipe.id));
  }

  return (
    <>
      <ScreenHeader
        title="Recipes for you"
        subtitle={hasIngredients ? `With ${ingredientSummary(ingredients)}` : "Popular with the Sous crowd"}
        back
        right={
          <IconButton label="Edit ingredients" className="size-11" onClick={() => router.push(FRIDGE_EDIT_HREF)}>
            <SlidersHorizontal className="size-[18px]" />
          </IconButton>
        }
      />

      <div className="px-5 pb-nav">
        {!hasIngredients ? (
          <NoIngredients onCook={cook} />
        ) : !ready ? (
          <div className="flex flex-col gap-5 pt-2" aria-busy="true" aria-label="Finding recipes">
            <div className="skeleton h-4 w-48 rounded-pill" />
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
          </div>
        ) : matches.length === 0 ? (
          <EmptyState
            icon={<SearchX className="size-6" />}
            title="No recipes for that combo"
            body="Try adding a couple more ingredients, like rice, pasta or eggs."
            action={
              <ButtonLink href={FRIDGE_EDIT_HREF} variant="soft" icon={<SlidersHorizontal className="size-4" />}>
                Edit ingredients
              </ButtonLink>
            }
          />
        ) : (
          <div className="flex flex-col gap-5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 animate-fade-up">
              <p className="text-sm text-ink-soft">
                <span className="font-semibold text-ink">
                  {matches.length} idea{matches.length === 1 ? "" : "s"}
                </span>
                , best matches first
              </p>
              <FallbackNote show={matchesSource === "cache"}>Showing saved recipes</FallbackNote>
            </div>
            {matches.map((m, i) => (
              <RecipeCard
                key={m.recipe.id}
                match={m}
                index={i}
                badge={i === 0 && m.used.length > 0 ? "Best match" : undefined}
                onCook={cook}
              />
            ))}
            <Attribution />
          </div>
        )}
      </div>
    </>
  );
}

/** No fridge scan yet: nudge toward a scan, but still show something cookable. */
function NoIngredients({ onCook }: { onCook: (recipe: Recipe) => void }) {
  const posts = useSocial((s) => s.posts);
  const myUpvotes = useSocial((s) => s.myUpvotes);

  const popular = useMemo(() => {
    const score = recipePopularity(posts, myUpvotes);
    return [...getCatalog()]
      .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0))
      .slice(0, 6)
      .map((r) => matchRecipe(r, []));
  }, [posts, myUpvotes]);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card bg-surface shadow-card animate-fade-up">
        <EmptyState
          icon={<Refrigerator className="size-6" />}
          title="Let's see what you've got"
          body="Scan your fridge and I'll match recipes to what's already inside."
          action={
            <ButtonLink href={FRIDGE_SCAN_HREF} icon={<Camera className="size-4" />} className="mt-1">
              Scan my fridge
            </ButtonLink>
          }
          className="py-8"
        />
      </div>
      {popular.length > 0 && (
        <>
          <SectionHeader title="Popular right now" className="pt-2" />
          {popular.map((m, i) => (
            <RecipeCard key={m.recipe.id} match={m} index={i} showMatch={false} badge={i === 0 ? "Most popular" : undefined} onCook={onCook} />
          ))}
          <Attribution />
        </>
      )}
    </div>
  );
}

function Attribution() {
  return (
    <p className="pt-1 text-center text-xs text-ink-faint">
      Recipes from{" "}
      <a href={SPOONACULAR_BACKLINK} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Spoonacular
      </a>
    </p>
  );
}
