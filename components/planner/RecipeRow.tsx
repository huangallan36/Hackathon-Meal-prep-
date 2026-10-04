"use client";

import { ChevronRight } from "lucide-react";
import { SmartImage } from "@/components/ui/Misc";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipeEyebrow, RecipeMeta, stagger } from "./RecipeMeta";

/** Compact list row: thumbnail, eyebrow tags, title, time + servings */
export function RecipeRow({
  recipe,
  index = 0,
  onOpen,
  className,
}: {
  recipe: Recipe;
  index?: number;
  onOpen: (recipe: Recipe) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(recipe)}
      style={stagger(index)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-card bg-surface p-3 pr-3.5 text-left shadow-card animate-fade-up transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <SmartImage src={recipe.image} alt="" className="size-[84px] shrink-0 rounded-tile" />
      <span className="min-w-0 flex-1">
        <RecipeEyebrow recipe={recipe} />
        <span className="mt-0.5 line-clamp-2 block font-display text-[17px] font-semibold leading-snug text-ink">
          {recipe.title}
        </span>
        <RecipeMeta recipe={recipe} className="mt-1.5" />
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/** Large lead card for the top match: full-width photo, title, summary */
export function FeatureCard({
  recipe,
  badge,
  onOpen,
}: {
  recipe: Recipe;
  badge?: string;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(recipe)}
      className="group block w-full overflow-hidden rounded-card bg-surface text-left shadow-card animate-fade-up transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span className="relative block overflow-hidden">
        <SmartImage
          src={recipe.image}
          alt=""
          className="aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded-pill bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-accent">
            {badge}
          </span>
        )}
      </span>
      <span className="block px-4 pb-4 pt-3.5">
        <RecipeEyebrow recipe={recipe} />
        <span className="mt-1 block text-balance font-display text-[22px] font-semibold leading-tight text-ink">
          {recipe.title}
        </span>
        {recipe.summary && <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ink-soft">{recipe.summary}</span>}
        <RecipeMeta recipe={recipe} className="mt-2.5" />
      </span>
    </button>
  );
}
