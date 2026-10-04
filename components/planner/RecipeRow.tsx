"use client";

import { recipeStats } from "@/lib/planner/format";
import { useIsSaved, usePlanner } from "@/lib/planner/store";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plate } from "./Plate";
import { stagger } from "./RecipeMeta";

/**
 * Figma "Similar" row: 60px plate thumb, title (15), "20 min · 580 kcal · 38g protein" (12)
 * and a bookmark that saves the recipe (green when saved, grey when not).
 */
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
  const saved = useIsSaved(recipe.id);
  const toggleSaved = usePlanner((s) => s.toggleSaved);
  return (
    <div
      style={stagger(index)}
      className={cn(
        "relative flex w-full items-center rounded-tile border border-line bg-surface animate-fade-up transition-transform has-[>button:first-child:active]:scale-[0.99]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(recipe)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-tile py-2 pl-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Plate slot="thumb" index={index} size={60} shape="thumb" src={recipe.image} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[normal]">
          <span className="truncate text-body font-semibold text-ink">{recipe.title}</span>
          <span className="truncate text-xs text-ink-soft">{recipeStats(recipe, true)}</span>
        </span>
      </button>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
        onClick={() => toast(toggleSaved(recipe) ? "Saved" : "Removed from saved", "default", 1600)}
        className="ml-1 mr-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <img
          src={saved ? "/figma/screens/2-148/icon-bookmark.svg" : "/figma/screens/2-148/icon-bookmark-1.svg"}
          alt=""
          width={20}
          height={20}
          className={cn("block size-5", saved && "animate-pop")}
        />
      </button>
    </div>
  );
}
