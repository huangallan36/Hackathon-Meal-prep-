import { Clock, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { minutesLabel } from "@/lib/kitchen/format";
import { recipeTags } from "@/lib/planner/search";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "35 min · 2 servings" with icons. `onPhoto` = light text for image overlays. */
export function RecipeMeta({
  recipe,
  onPhoto,
  compact,
  className,
}: {
  recipe: Pick<Recipe, "readyInMinutes" | "servings">;
  onPhoto?: boolean;
  /** Hide servings (narrow tiles) */
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]",
        onPhoto ? "text-white/85" : "text-ink-soft",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <Clock className={cn("size-3.5", onPhoto ? "text-white/85" : "text-accent")} />
        {minutesLabel(recipe.readyInMinutes)}
      </span>
      {!compact && (
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
        </span>
      )}
    </span>
  );
}

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
