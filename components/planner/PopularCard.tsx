"use client";

import { Flame } from "lucide-react";
import { SmartImage } from "@/components/ui/Misc";
import type { Recipe } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { RecipeEyebrow, RecipeMeta, stagger } from "./RecipeMeta";

/** Tall, photo-first card for the "Most Popular" scroller */
export function PopularCard({
  recipe,
  upvotes,
  rank,
  index = 0,
  onOpen,
}: {
  recipe: Recipe;
  upvotes: number;
  /** 1-based position; shown as an editorial numeral */
  rank: number;
  index?: number;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(recipe)}
      aria-label={`${recipe.title}${upvotes ? `, ${upvotes} yums` : ""}`}
      style={stagger(index)}
      className="group relative block w-[212px] shrink-0 snap-start overflow-hidden rounded-card bg-cream-deep text-left shadow-card animate-fade-up transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
    >
      <SmartImage
        src={recipe.image}
        alt=""
        className="aspect-[3/4] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/85 via-ink/20 to-ink/0" />

      {upvotes > 0 && (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-surface/92 px-2.5 py-1 text-xs font-semibold tabular-nums text-ink shadow-soft backdrop-blur">
          <Flame className="size-3.5 text-accent" fill="currentColor" strokeWidth={2.2} />
          {formatCount(upvotes)}
        </span>
      )}
      <span
        aria-hidden
        className="absolute right-3.5 top-2 font-display text-[30px] font-semibold italic leading-none text-white/95 [text-shadow:0_2px_12px_rgb(0_0_0/0.35)]"
      >
        {rank}
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-4">
        <RecipeEyebrow recipe={recipe} max={1} onPhoto />
        <span className="mt-1 line-clamp-3 block font-display text-[19px] font-semibold leading-[1.2] text-white">
          {recipe.title}
        </span>
        <RecipeMeta recipe={recipe} onPhoto className="mt-2" />
      </span>
    </button>
  );
}
