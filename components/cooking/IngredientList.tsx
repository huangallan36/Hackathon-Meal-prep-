"use client";

import { Check, Leaf } from "lucide-react";
import { useState } from "react";
import { ingredientMatches, isPantry } from "@/lib/recipes/catalog";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";

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
            className={cn("flex items-center gap-3 animate-fade-up", compact ? "py-2" : "py-2.5")}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
          >
            {!compact && <IngredientThumb src={ing.image} />}
            <span className={cn("min-w-0 flex-1 text-[15px] leading-snug text-ink", status === "missing" && "text-ink-soft")}>
              {ing.original}
            </span>
            {status === "have" && (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-herb-soft text-herb" title="In your fridge">
                <Check className="size-3.5" strokeWidth={3} />
                <span className="sr-only">You have this</span>
              </span>
            )}
            {status === "missing" && (
              <span className="shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">Need</span>
            )}
            {status === "pantry" && <span className="shrink-0 text-[11px] font-medium text-ink-faint">Pantry</span>}
          </li>
        );
      })}
    </ul>
  );
}

function IngredientThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-deep">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" className="size-8 object-contain" onError={() => setFailed(true)} />
      ) : (
        <Leaf className="size-4 text-herb" />
      )}
    </span>
  );
}
