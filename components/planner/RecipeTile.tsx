"use client";

import type { ReactNode } from "react";
import { SmartImage } from "@/components/ui/Misc";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipeEyebrow, RecipeMeta, stagger } from "./RecipeMeta";

/**
 * Grid tile. `wide` spans both columns with the photo on the left, which is how an odd
 * last item (or a single result) fills the row instead of leaving a hole.
 */
export function RecipeTile({
  recipe,
  index = 0,
  wide,
  overlay,
  onOpen,
}: {
  recipe: Recipe;
  index?: number;
  wide?: boolean;
  /** Extra content laid over the photo (e.g. pairing pills) */
  overlay?: ReactNode;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(recipe)}
      style={stagger(index)}
      className={cn(
        "group overflow-hidden rounded-card bg-surface text-left shadow-card animate-fade-up transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        wide ? "col-span-2 flex items-stretch" : "flex flex-col",
      )}
    >
      <span className={cn("relative block shrink-0 overflow-hidden", wide ? "w-[44%]" : "w-full")}>
        <SmartImage
          src={recipe.image}
          alt=""
          className={cn(
            "w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]",
            wide ? "h-full min-h-[136px]" : "aspect-[4/3]",
          )}
        />
        {overlay}
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col", wide ? "justify-center p-4" : "p-3.5 pt-3")}>
        <RecipeEyebrow recipe={recipe} max={1} />
        <span
          className={cn(
            "mt-0.5 block font-display font-semibold leading-snug text-ink",
            wide ? "line-clamp-3 text-[18px]" : "line-clamp-2 text-[16px]",
          )}
        >
          {recipe.title}
        </span>
        <RecipeMeta recipe={recipe} compact={!wide} className="mt-auto pt-2" />
      </span>
    </button>
  );
}

/** Two-column grid where an odd trailing item becomes a wide tile */
export function TileGrid<T>({
  items,
  render,
}: {
  items: T[];
  render: (item: T, index: number, wide: boolean) => ReactNode;
}) {
  const oddTail = items.length % 2 === 1;
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, i) => render(item, i, oddTail && i === items.length - 1))}
    </div>
  );
}
