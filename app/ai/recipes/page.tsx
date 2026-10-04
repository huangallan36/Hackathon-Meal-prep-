"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { RecipeCard, RecipeCardSkeleton } from "@/components/kitchen/RecipeCard";
import { SousAvatar, SousLine } from "@/components/kitchen/SousLine";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { EmptyState, FallbackNote } from "@/components/ui/Misc";
import { PageTitle, ScreenHeader } from "@/components/ui/ScreenHeader";
import { fromSpoonacular, SPOONACULAR_BACKLINK } from "@/lib/config";
import { announceMatches, fetchMatches } from "@/lib/kitchen/client";
import { bestMatchLine, ingredientSummary } from "@/lib/kitchen/format";
import { cookHref, FRIDGE_EDIT_HREF, FRIDGE_SCAN_HREF } from "@/lib/kitchen/routes";
import { getCatalog, matchRecipe } from "@/lib/recipes/catalog";
import { ingredientsKey, useKitchen } from "@/lib/stores/kitchen";
import { recipePopularity, useSocial } from "@/lib/stores/social";
import type { Recipe } from "@/lib/types";

/** The planner's header filter icon (Figma 2.1, 18px), used here for "Edit ingredients" */
const ICON_FILTER = "/figma/v2/2014-993/icon-filter.svg";

/**
 * Recipe suggestions for what's in the fridge (no Figma frame: built in the 2.x language).
 * Real recipe photos in 18px frames, Bricolage titles, avocado actions, and the chosen voice's
 * mascot wherever Sous speaks (the best-match line, the empty states).
 */
export default function RecipesPage() {
  const router = useRouter();
  const ingredients = useKitchen((s) => s.ingredients);
  const matches = useKitchen((s) => s.matches);
  const matchesFor = useKitchen((s) => s.matchesFor);
  const matchesSource = useKitchen((s) => s.matchesSource);

  const key = ingredientsKey(ingredients);
  const hasIngredients = key !== "";
  const ready = hasIngredients && matchesFor === key;
  const line = ready ? bestMatchLine(matches) : null;

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
        back
        right={
          <IconButton label="Edit ingredients" onClick={() => router.push(FRIDGE_EDIT_HREF)}>
            <img src={ICON_FILTER} alt="" width={18} height={18} className="size-[18px]" />
          </IconButton>
        }
      />

      {/* Figma text uses "normal" line height; children inherit it */}
      <div className="pb-nav leading-[normal]">
        <PageTitle
          title="Recipes for you"
          subtitle={
            <span className="text-sm leading-[normal]">
              {hasIngredients ? `With ${ingredientSummary(ingredients)}` : "Popular with the Sous crowd"}
            </span>
          }
          className="pt-0.5"
        />

        <div className="px-5 pt-5">
          {!hasIngredients ? (
            <NoIngredients onCook={cook} />
          ) : !ready ? (
            <div className="flex flex-col gap-4" aria-busy="true" aria-label="Finding recipes">
              <div className="skeleton h-[46px] w-full rounded-[16px]" />
              <div className="skeleton h-[22px] w-40 rounded-pill" />
              <RecipeCardSkeleton />
              <RecipeCardSkeleton />
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-card bg-surface shadow-card">
              <EmptyState
                icon={<SousAvatar size={56} />}
                title="No recipes for that combo"
                body="Try adding a couple more ingredients, like rice, pasta or eggs."
                action={
                  <ButtonLink href={FRIDGE_EDIT_HREF} variant="soft" className="mt-1">
                    Edit ingredients
                  </ButtonLink>
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {line && <SousLine live>{line}</SousLine>}
              <div className="flex flex-col gap-2">
                <SectionHeader
                  title="Best matches"
                  action={
                    <span className="text-meta font-medium text-ink-soft">
                      {matches.length} idea{matches.length === 1 ? "" : "s"}
                    </span>
                  }
                />
                {matchesSource === "cache" && (
                  <div>
                    <FallbackNote show>Showing saved recipes</FallbackNote>
                  </div>
                )}
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
              <Attribution recipes={matches.map((m) => m.recipe)} />
            </div>
          )}
        </div>
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
    <div className="flex flex-col gap-4">
      <div className="rounded-card bg-surface shadow-card animate-fade-up">
        <EmptyState
          icon={<SousAvatar size={56} />}
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
          <Attribution recipes={popular.map((m) => m.recipe)} />
        </>
      )}
    </div>
  );
}

/** Spoonacular's required credit when a listed recipe came from it; catalog photos are credited on each recipe */
function Attribution({ recipes }: { recipes: Recipe[] }) {
  if (!recipes.some(fromSpoonacular)) {
    return <p className="pt-1 text-center text-xs text-ink-faint">Dish photos from Wikimedia Commons, credited on each recipe</p>;
  }
  return (
    <p className="pt-1 text-center text-xs text-ink-faint">
      Recipes from{" "}
      <a href={SPOONACULAR_BACKLINK} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        Spoonacular
      </a>
    </p>
  );
}
