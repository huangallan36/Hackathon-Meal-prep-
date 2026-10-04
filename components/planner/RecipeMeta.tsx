import type { CSSProperties } from "react";
import { recipeTags } from "@/lib/planner/search";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Small uppercase eyebrow tags: "Chinese · Vegetarian" */
export function RecipeEyebrow({
  recipe,
  max = 2,
  maxChars = 24,
  onPhoto,
  className,
}: {
  recipe: Recipe;
  max?: number;
  /** Drop trailing tags rather than truncating mid-word */
  maxChars?: number;
  onPhoto?: boolean;
  className?: string;
}) {
  const tags = recipeTags(recipe, max);
  while (tags.length > 1 && tags.join(" · ").length > maxChars) tags.pop();
  if (!tags.length) return null;
  return (
    <span
      className={cn(
        "block truncate text-[11px] font-semibold uppercase tracking-[0.12em]",
        onPhoto ? "text-white/75" : "text-accent-strong",
        className,
      )}
    >
      {tags.join(" · ")}
    </span>
  );
}

/** Stagger helper for CSS fade-up lists */
export function stagger(index: number, step = 55): CSSProperties {
  return { animationDelay: `${Math.min(index, 8) * step}ms` };
}
