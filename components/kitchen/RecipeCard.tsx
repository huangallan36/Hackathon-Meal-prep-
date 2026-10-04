"use client";

import { ArrowRight, Check, Clock, Flame, ShoppingBasket, Users } from "lucide-react";
import { motion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SmartImage } from "@/components/ui/Misc";
import { minutesLabel } from "@/lib/kitchen/format";
import { groceriesHref } from "@/lib/kitchen/routes";
import type { Recipe, RecipeMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_USED_CHIPS = 4;

/**
 * Suggestion card: photo, title, time/servings and how well it fits the fridge.
 * `showMatch={false}` swaps the fridge-fit row for a neutral meta line (popular list).
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
  /** e.g. "Best match", "Popular" */
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
      className="overflow-hidden rounded-card bg-surface shadow-card"
    >
      <button
        type="button"
        onClick={() => onCook(recipe)}
        aria-label={`Cook ${recipe.title}`}
        className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <div className="relative overflow-hidden">
          <SmartImage
            src={recipe.image}
            alt={recipe.title}
            className="aspect-[16/10] w-full transition-transform duration-500 group-active:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/25 to-transparent" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-soft backdrop-blur">
            <Clock className="size-3.5 text-accent" />
            {minutesLabel(recipe.readyInMinutes)}
          </span>
          {badge && (
            <span className="absolute right-3 top-3 rounded-pill bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-accent">
              {badge}
            </span>
          )}
        </div>
        <div className="px-4 pt-3.5">
          <h3 className="line-clamp-2 font-display text-[19px] font-semibold leading-snug text-ink">{recipe.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
            </span>
            {recipe.nutrition?.calories ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3.5" />
                {recipe.nutrition.calories} kcal
              </span>
            ) : null}
            {!showMatch && <span>{recipe.ingredients.length} ingredients</span>}
          </p>
        </div>
      </button>

      <div className="px-4 pb-4 pt-3">
        {showMatch && (
          <>
            <p className={cn("text-[13px] font-semibold", used.length ? "text-herb" : "text-ink-soft")}>
              {used.length
                ? `Uses ${used.length} of your ingredient${used.length === 1 ? "" : "s"}`
                : "Doesn't use your fridge much, but worth a look"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {used.slice(0, MAX_USED_CHIPS).map((name) => (
                <Chip key={name} tone="herb" className="px-2.5 py-1 text-xs">
                  {name}
                </Chip>
              ))}
              {extraUsed > 0 && (
                <Chip tone="herb" className="px-2.5 py-1 text-xs">
                  +{extraUsed}
                </Chip>
              )}
              {missing.length > 0 ? (
                <Chip tone="accent" className="px-2.5 py-1 text-xs">
                  +{missing.length} missing
                </Chip>
              ) : (
                <Chip tone="herb" icon={<Check className="size-3.5" />} className="px-2.5 py-1 text-xs">
                  You have everything
                </Chip>
              )}
            </div>
          </>
        )}

        <div className={cn("flex gap-2", showMatch && "mt-3.5")}>
          {missing.length > 0 && (
            <ButtonLink
              href={groceriesHref(recipe.id)}
              variant="secondary"
              size="sm"
              className="h-11 flex-1"
              icon={<ShoppingBasket className="size-4" />}
            >
              Groceries
            </ButtonLink>
          )}
          <Button size="sm" className="h-11 flex-1" onClick={() => onCook(recipe)}>
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
    <div aria-hidden className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="skeleton aspect-[16/10] w-full" />
      <div className="space-y-2.5 p-4">
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
