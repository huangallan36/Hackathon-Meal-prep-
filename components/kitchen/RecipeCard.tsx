"use client";

import { ArrowRight, Check, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { minutesLabel, plural } from "@/lib/kitchen/format";
import { groceriesHref } from "@/lib/kitchen/routes";
import type { Recipe, RecipeMatch } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatePhoto } from "./PlatePhoto";

const MAX_USED_CHIPS = 4;
const SMALL_CHIP = "px-2.5 py-1 text-xs";

/** "35 min · 2 servings · 540 kcal" (Figma card meta line) */
function metaLine(recipe: Recipe, extra?: string): string {
  const parts = [minutesLabel(recipe.readyInMinutes), plural(recipe.servings, "serving")];
  if (recipe.nutrition?.calories) parts.push(`${Math.round(recipe.nutrition.calories)} kcal`);
  if (extra) parts.push(extra);
  return parts.join(" · ");
}

/**
 * Suggestion card in the Figma language: flat white card with a 1px line, the recipe's photo
 * in an 18px frame (the plate illustration when it has none), Bricolage title, 12px meta and
 * the source in avocado (Figma 2.1 cards), then how well it fits the fridge and the
 * Groceries / Cook this actions.
 * `showMatch={false}` swaps the fridge-fit row for an ingredient count (popular list).
 */
export function RecipeCard({
  match,
  index = 0,
  badge,
  showMatch = true,
  onCook,
}: {
  match: RecipeMatch;
  /** Position in the list, drives the stagger */
  index?: number;
  /** e.g. "Best match", "Most popular" */
  badge?: string;
  showMatch?: boolean;
  onCook: (recipe: Recipe) => void;
}) {
  const { recipe, used, missing } = match;
  const extraUsed = used.length - MAX_USED_CHIPS;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-card bg-surface p-2.5 shadow-card"
    >
      <button
        type="button"
        onClick={() => onCook(recipe)}
        aria-label={`Cook ${recipe.title}`}
        className="group block w-full rounded-tile text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <PlatePhoto
          src={recipe.image}
          alt={recipe.title}
          seed={recipe.id}
          className="h-[148px] w-full transition-transform duration-500 group-active:scale-[0.99]"
        >
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-pill bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink">
            <Clock className="size-3.5 text-accent" strokeWidth={2.2} />
            {minutesLabel(recipe.readyInMinutes)}
          </span>
          {badge && (
            <span className="absolute right-2.5 top-2.5 rounded-pill bg-accent px-2.5 py-1 text-caption font-bold text-white">
              {badge}
            </span>
          )}
        </PlatePhoto>
        <span className="block px-1.5 pt-3">
          <span className="line-clamp-2 block font-display text-section font-semibold leading-snug text-ink">{recipe.title}</span>
          <span className="mt-1 block text-xs text-ink-soft">
            {metaLine(recipe, showMatch ? undefined : plural(recipe.ingredients.length, "ingredient"))}
          </span>
          {recipe.sourceName && <span className="mt-1 block truncate text-caption font-semibold text-accent">{recipe.sourceName}</span>}
        </span>
      </button>

      <div className="px-1.5 pb-1 pt-3">
        {showMatch && (
          <>
            <p className={cn("text-meta font-semibold", used.length ? "text-accent" : "text-ink-soft")}>
              {used.length ? `Uses ${used.length} of your ingredients` : "Doesn't use your fridge much, but worth a look"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {used.slice(0, MAX_USED_CHIPS).map((name) => (
                <Chip key={name} tone="accent" className={SMALL_CHIP}>
                  {name}
                </Chip>
              ))}
              {extraUsed > 0 && (
                <Chip tone="accent" className={SMALL_CHIP}>
                  +{extraUsed}
                </Chip>
              )}
              {missing.length > 0 ? (
                <Chip tone="butter" className={SMALL_CHIP}>
                  +{missing.length} missing
                </Chip>
              ) : (
                <Chip tone="accent" icon={<Check className="size-3.5" />} className={SMALL_CHIP}>
                  You have everything
                </Chip>
              )}
            </div>
          </>
        )}

        <div className={cn("flex gap-2", showMatch && "mt-3.5")}>
          {missing.length > 0 && (
            <ButtonLink href={groceriesHref(recipe.id)} variant="secondary" className="h-11 flex-1 text-sm">
              Groceries
            </ButtonLink>
          )}
          <Button className="h-11 flex-1 text-sm" onClick={() => onCook(recipe)}>
            Cook this
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div aria-hidden className="rounded-card bg-surface p-2.5 shadow-card">
      <div className="skeleton h-[148px] w-full rounded-tile" />
      <div className="space-y-2.5 px-1.5 pb-1 pt-3">
        <div className="skeleton h-5 w-3/4 rounded-pill" />
        <div className="skeleton h-3.5 w-1/3 rounded-pill" />
        <div className="flex gap-1.5 pt-2">
          <div className="skeleton h-6 w-16 rounded-pill" />
          <div className="skeleton h-6 w-20 rounded-pill" />
          <div className="skeleton h-6 w-14 rounded-pill" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-11 flex-1 rounded-pill" />
          <div className="skeleton h-11 flex-1 rounded-pill" />
        </div>
      </div>
    </div>
  );
}
