"use client";

import { ChefHat, ChevronRight, Clock, ExternalLink, Flame, ListOrdered, ShoppingBasket, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SmartImage } from "@/components/ui/Misc";
import { SPOONACULAR_BACKLINK } from "@/lib/config";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { availabilityOf, IngredientList } from "./IngredientList";

/** Cooking mode before step 1: photo, facts, what you have vs. need, and the big Start button. */
export function RecipeOverview({ recipe, onStart }: { recipe: Recipe; onStart: () => void }) {
  const fridge = useKitchen((s) => s.ingredients);
  const availability = useMemo(() => availabilityOf(recipe.ingredients, fridge), [recipe.ingredients, fridge]);
  const counts = useMemo(() => {
    if (!availability) return null;
    const values = [...availability.values()];
    return { have: values.filter((v) => v === "have").length, missing: values.filter((v) => v === "missing").length };
  }, [availability]);

  return (
    <div className="flex flex-col gap-5">
      <div className="animate-fade-up">
        <SmartImage src={recipe.image} alt={recipe.title} className="h-[236px] w-full rounded-card shadow-card" />
      </div>

      <div className="animate-fade-up [animation-delay:60ms]">
        <h1 className="text-balance font-display text-[28px] font-semibold leading-[1.15] text-ink">{recipe.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip icon={<Clock className="size-3.5 text-accent" />}>{recipe.readyInMinutes} min</Chip>
          <Chip icon={<Users className="size-3.5 text-accent" />}>Serves {recipe.servings}</Chip>
          <Chip icon={<ListOrdered className="size-3.5 text-accent" />}>{recipe.steps.length} steps</Chip>
          {recipe.nutrition && (
            <Chip icon={<Flame className="size-3.5 text-accent" />}>{Math.round(recipe.nutrition.calories)} kcal</Chip>
          )}
        </div>
        {recipe.summary && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{recipe.summary}</p>}
      </div>

      {counts && (
        <div className="flex items-center gap-3 rounded-tile bg-herb-soft px-4 py-3 animate-fade-up [animation-delay:100ms]">
          <span className="font-display text-2xl font-semibold text-herb">
            {counts.have}/{counts.have + counts.missing}
          </span>
          <p className="text-sm leading-snug text-ink-soft">
            {counts.missing === 0
              ? "You have everything you need. Let's go!"
              : `You have ${counts.have} of ${counts.have + counts.missing} ingredients. ${counts.missing} to grab or swap.`}
          </p>
        </div>
      )}

      {recipe.steps.length > 0 ? (
        <Button size="lg" full onClick={onStart} icon={<ChefHat className="size-5" />} className="animate-fade-up [animation-delay:120ms]">
          Start cooking
        </Button>
      ) : recipe.sourceUrl ? (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-accent font-semibold text-white shadow-accent transition active:scale-[0.97]"
        >
          <ExternalLink className="size-5" />
          Open the full recipe
        </a>
      ) : (
        <p className="rounded-tile bg-butter-soft px-4 py-3 text-sm text-ink-soft">This recipe has no step-by-step instructions.</p>
      )}

      <Card className="p-5 animate-fade-up [animation-delay:160ms]">
        <SectionHeader
          title="Ingredients"
          action={<span className="text-sm font-medium text-ink-faint">{recipe.ingredients.length} items</span>}
        />
        <div className="mt-2">
          <IngredientList ingredients={recipe.ingredients} availability={availability} />
        </div>
        <Link
          href={`/ai/groceries/${recipe.id}`}
          className="mt-3 flex min-h-12 items-center gap-3 rounded-tile bg-cream-deep px-4 py-3 text-sm font-semibold text-ink transition hover:bg-accent-soft active:scale-[0.99]"
        >
          <ShoppingBasket className="size-5 text-accent" />
          <span className="flex-1">Missing something? Groceries</span>
          <ChevronRight className="size-4 text-ink-faint" />
        </Link>
      </Card>

      {recipe.nutrition && <PerServing nutrition={recipe.nutrition} />}
    </div>
  );
}

function PerServing({ nutrition }: { nutrition: NonNullable<Recipe["nutrition"]> }) {
  const items = [
    { label: "Protein", value: nutrition.protein, dot: "bg-protein" },
    { label: "Carbs", value: nutrition.carbs, dot: "bg-carbs" },
    { label: "Fat", value: nutrition.fat, dot: "bg-fat" },
    { label: "Fiber", value: nutrition.fiber, dot: "bg-fiber" },
  ];
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">Per serving</h2>
        <p className="text-sm text-ink-soft">
          <span className="font-display text-lg font-semibold text-ink">{Math.round(nutrition.calories)}</span> kcal
        </p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map((m) => (
          <div key={m.label} className="rounded-tile bg-cream px-2 py-2.5 text-center">
            <p className="text-base font-semibold tabular-nums text-ink">{Math.round(m.value)}g</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-medium text-ink-faint">
              <span className={`size-1.5 rounded-full ${m.dot}`} />
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Spoonacular's terms require a visible credit + backlink */
export function RecipeCredits({ recipe }: { recipe: Pick<Recipe, "sourceName" | "sourceUrl"> }) {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-ink-faint">
      {recipe.sourceName && (
        <span>
          Recipe by{" "}
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink-soft underline-offset-2 hover:underline">
              {recipe.sourceName}
            </a>
          ) : (
            <span className="font-semibold text-ink-soft">{recipe.sourceName}</span>
          )}
        </span>
      )}
      {recipe.sourceName && <span aria-hidden>&middot;</span>}
      <a href={SPOONACULAR_BACKLINK} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
        Powered by spoonacular
      </a>
    </p>
  );
}
