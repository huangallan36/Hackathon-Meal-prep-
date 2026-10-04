"use client";

import { Leaf } from "lucide-react";
import { useState } from "react";
import { ingredientMatches, isPantry } from "@/lib/recipes/catalog";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";

export type Availability = "have" | "missing" | "pantry";

/** have / missing / pantry per ingredient, or null when there is no fridge scan to compare with */
export function availabilityOf(ingredients: Ingredient[], fridge: string[]): Map<Ingredient, Availability> | null {
  if (!fridge.length) return null;
  const out = new Map<Ingredient, Availability>();
  for (const ing of ingredients) {
    if (isPantry(ing.name)) out.set(ing, "pantry");
    else out.set(ing, fridge.some((f) => ingredientMatches(f, ing.name)) ? "have" : "missing");
  }
  return out;
}

/** Ingredient rows in the Figma 2.4 list style: 15px text, 1px dividers, status on the right */
export function IngredientList({
  ingredients,
  availability,
  compact = false,
}: {
  ingredients: Ingredient[];
  availability: Map<Ingredient, Availability> | null;
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {ingredients.map((ing, i) => {
        const status = availability?.get(ing);
        return (
          <li
            key={`${ing.name}-${i}`}
            className={cn("flex items-center gap-3 animate-fade-up", compact ? "py-2.5" : "py-3")}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
          >
            {!compact && <IngredientThumb src={ing.image} />}
            <span className={cn("min-w-0 flex-1 text-body leading-snug text-ink", status === "missing" && "text-ink-soft")}>
              {ing.original}
            </span>
            {status === "have" && (
              <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-accent" title="In your fridge">
                <img src={COOK_ICON.check} alt="" width={14} height={14} className="block size-3.5" />
                <span className="sr-only">You have this</span>
              </span>
            )}
            {status === "missing" && (
              <span className="shrink-0 rounded-pill bg-butter-soft px-2.5 py-1 text-caption font-semibold leading-none text-butter-ink">
                Need
              </span>
            )}
            {status === "pantry" && <span className="shrink-0 text-caption font-medium text-ink-faint">Pantry</span>}
          </li>
        );
      })}
    </ul>
  );
}

function IngredientThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="size-7 object-contain" onError={() => setFailed(true)} />
      ) : (
        <Leaf className="size-4 text-accent" />
      )}
    </span>
  );
}
