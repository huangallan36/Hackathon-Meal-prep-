"use client";

import { Heart } from "lucide-react";
import { recipeStats } from "@/lib/planner/format";
import { useIsSaved, usePlanner } from "@/lib/planner/store";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";
import { PlateCard } from "./Plate";
import { stagger } from "./RecipeMeta";

/** Figma "Most popular" card: 158x128 plate tile with a heart, title, "30 min · 610 kcal" */
export function PopularCard({
  recipe,
  upvotes,
  index = 0,
  onOpen,
}: {
  recipe: Recipe;
  upvotes: number;
  index?: number;
  onOpen: (recipe: Recipe) => void;
}) {
  return (
    <div style={stagger(index)} className="relative w-[158px] shrink-0 snap-start animate-fade-up">
      <button
        type="button"
        onClick={() => onOpen(recipe)}
        aria-label={`${recipe.title}${upvotes ? `, ${formatCount(upvotes)} yums` : ""}`}
        className="group flex w-full flex-col items-start gap-1.5 rounded-tile text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
      >
        <PlateCard index={index} src={recipe.image} />
        <span className="block w-full truncate text-body font-semibold leading-[normal] text-ink">{recipe.title}</span>
        <span className="block w-full truncate text-xs leading-[normal] text-ink-soft">{recipeStats(recipe)}</span>
      </button>
      <SaveHeart recipe={recipe} className="absolute left-[120px] top-2" />
    </div>
  );
}

/** Figma heart (30px white circle): saves the recipe */
function SaveHeart({ recipe, className }: { recipe: Recipe; className?: string }) {
  const saved = useIsSaved(recipe.id);
  const toggleSaved = usePlanner((s) => s.toggleSaved);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${recipe.title}` : `Save ${recipe.title}`}
      onClick={() => toast(toggleSaved(recipe) ? "Saved" : "Removed from saved", "default", 1600)}
      className={cn(
        "inline-flex size-[30px] items-center justify-center rounded-full bg-surface/90 transition after:absolute after:-inset-2 after:content-[''] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      {saved ? (
        <Heart aria-hidden className="size-[15px] text-flame animate-pop" fill="currentColor" strokeWidth={1.8} />
      ) : (
        <img src="/figma/screens/2-146/icon-heart.svg" alt="" width={15} height={15} className="block size-[15px]" />
      )}
    </button>
  );
}
