"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlatePhoto } from "@/components/kitchen/PlatePhoto";
import { Card, SectionHeader } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/ScreenHeader";
import { fromSpoonacular, SPOONACULAR_BACKLINK } from "@/lib/config";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ROW_CHEVRON } from "./icons";
import { availabilityOf, IngredientList } from "./IngredientList";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Cooking mode before step 1, in the Figma language: a Bricolage page title, the recipe's
 * photo (radius 18; the plate illustration when it has none), what you have vs. need, the
 * ingredient list and per-serving numbers.
 * "Start cooking" lives in the bottom sheet, so it is always in reach.
 */
export function RecipeOverview({ recipe }: { recipe: Recipe }) {
  const fridge = useKitchen((s) => s.ingredients);
  const availability = useMemo(() => availabilityOf(recipe.ingredients, fridge), [recipe.ingredients, fridge]);
  const counts = useMemo(() => {
    if (!availability) return null;
    const values = [...availability.values()];
    return { have: values.filter((v) => v === "have").length, missing: values.filter((v) => v === "missing").length };
  }, [availability]);

  const meta = [`${recipe.readyInMinutes} min`, `serves ${recipe.servings}`, plural(recipe.steps.length, "step")].join(" · ");

  return (
    <div className="flex flex-col gap-4 pb-6">
      <PageTitle title={recipe.title} subtitle={meta} className="text-balance pt-2 animate-fade-up" />

      <div className="px-5 animate-fade-up [animation-delay:60ms]">
        <PlatePhoto src={recipe.image} alt={recipe.title} seed={recipe.id} className="h-[200px] w-full" />
        {recipe.summary && <p className="mt-3 text-sm leading-[1.4] text-ink-soft">{recipe.summary}</p>}
      </div>

      {counts && (
        <div className="mx-5 flex items-center gap-3 rounded-tile bg-accent-soft px-4 py-3 animate-fade-up [animation-delay:100ms]">
          <span className="font-display text-heading font-semibold text-accent">
            {counts.have}/{counts.have + counts.missing}
          </span>
          <p className="text-meta leading-[1.4] text-ink">
            {counts.missing === 0
              ? "You have everything you need. Let's go!"
              : `You have ${counts.have} of ${counts.have + counts.missing} ingredients. ${counts.missing} to grab or swap.`}
          </p>
        </div>
      )}

      {recipe.steps.length === 0 && !recipe.sourceUrl && (
        <p className="mx-5 rounded-tile bg-butter-soft px-4 py-3 text-sm text-butter-ink">This recipe has no step-by-step instructions.</p>
      )}

      <Card className="mx-5 px-4 pb-2 pt-4 animate-fade-up [animation-delay:140ms]">
        <SectionHeader title="Ingredients" action={<span className="text-meta text-ink-soft">{plural(recipe.ingredients.length, "item")}</span>} />
        <div className="mt-1">
          <IngredientList ingredients={recipe.ingredients} availability={availability} />
        </div>
        <Link
          href={`/ai/groceries/${recipe.id}`}
          className="-mx-4 flex min-h-12 items-center gap-2 border-t border-line px-4 py-3 text-body font-semibold text-accent transition hover:bg-cream active:bg-cream-deep"
        >
          <span className="flex-1">Missing something? Groceries</span>
          <img src={ROW_CHEVRON} alt="" width={18} height={18} className="block size-[18px]" />
        </Link>
      </Card>

      {recipe.nutrition && <PerServing nutrition={recipe.nutrition} />}

      <RecipeCredits recipe={recipe} />
    </div>
  );
}

const MACROS = [
  { key: "protein", label: "Protein", tint: "bg-accent-soft text-accent" },
  { key: "carbs", label: "Carbs", tint: "bg-butter-soft text-butter-ink" },
  { key: "fat", label: "Fat", tint: "bg-flame-soft text-flame" },
  { key: "fiber", label: "Fiber", tint: "bg-sky-soft text-sky" },
] as const;

function PerServing({ nutrition }: { nutrition: NonNullable<Recipe["nutrition"]> }) {
  return (
    <Card className="mx-5 p-4">
      <SectionHeader
        title="Per serving"
        action={
          <p className="text-meta text-ink-soft">
            <span className="font-display text-lead font-semibold text-ink">{Math.round(nutrition.calories)}</span> kcal
          </p>
        }
      />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {MACROS.map((m) => (
          <div key={m.key} className={cn("rounded-thumb px-2 py-2.5 text-center", m.tint)}>
            <p className="text-base font-semibold leading-[normal] tabular-nums">{Math.round(nutrition[m.key])}g</p>
            <p className="mt-0.5 text-caption font-medium leading-[normal]">{m.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Credits under a recipe: its source, its photo, and the backlink Spoonacular's terms require for its recipes */
export function RecipeCredits({
  recipe,
  className,
}: {
  recipe: Pick<Recipe, "id" | "sourceName" | "sourceUrl" | "image" | "imageCredit">;
  className?: string;
}) {
  // Recipes saved before photo credits existed (persisted stores) still get theirs from the catalog
  const credit = recipe.imageCredit ?? getCachedRecipe(recipe.id)?.imageCredit;
  const parts = [
    recipe.sourceName && (
      <span key="source">
        Recipe by{" "}
        {recipe.sourceUrl ? (
          <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-soft underline-offset-2 hover:underline">
            {recipe.sourceName}
          </a>
        ) : (
          <span className="font-semibold text-ink-soft">{recipe.sourceName}</span>
        )}
      </span>
    ),
    credit && (
      <span key="photo">
        Photo:{" "}
        {credit.url ? (
          <a href={credit.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {credit.text}
          </a>
        ) : (
          credit.text
        )}
      </span>
    ),
    // Only recipes that came from Spoonacular carry its credit (the bundled catalog doesn't)
    fromSpoonacular(recipe) && (
      <a key="spoonacular" href={SPOONACULAR_BACKLINK} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        Powered by spoonacular
      </a>
    ),
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-2 px-5 text-center text-xs text-ink-faint [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center",
        className,
      )}
    >
      {parts.flatMap((part, i) => (i ? [<span key={`dot-${i}`} aria-hidden>&middot;</span>, part] : [part]))}
    </p>
  );
}
