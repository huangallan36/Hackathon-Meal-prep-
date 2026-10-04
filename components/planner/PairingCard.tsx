"use client";

import { Plus } from "lucide-react";
import { capitalize } from "@/lib/planner/search";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipeTile } from "./RecipeTile";

/**
 * A combination: the recipe tile with "Chicken + Rice" pills over the photo. Pairs the user
 * already has (fridge chips) are tinted herb green, matching the rest of the app.
 */
export function PairingCard({
  recipe,
  anchor,
  pair,
  fromFridge,
  index,
  wide,
  onOpen,
}: {
  recipe: Recipe;
  anchor: string | null;
  pair?: string;
  fromFridge?: boolean;
  index?: number;
  wide?: boolean;
  onOpen: (recipe: Recipe) => void;
}) {
  // Over the photo on grid tiles; in the text column on a wide tile, where the photo is narrow.
  const pills = pair ? (
    <span
      className={cn(
        "flex flex-wrap items-center gap-1",
        wide ? "mt-2" : "absolute inset-x-2.5 bottom-2.5",
      )}
    >
      {anchor && <Pill onPhoto={!wide}>{capitalize(anchor)}</Pill>}
      {anchor && (
        <span
          aria-hidden
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full",
            wide ? "text-ink-faint" : "bg-ink/55 text-white backdrop-blur",
          )}
        >
          <Plus className="size-3" strokeWidth={3} />
        </span>
      )}
      <Pill onPhoto={!wide} herb={fromFridge}>
        {capitalize(pair)}
      </Pill>
    </span>
  ) : null;

  return (
    <RecipeTile
      recipe={recipe}
      index={index}
      wide={wide}
      overlay={wide ? undefined : pills}
      extra={wide ? pills : undefined}
      onOpen={onOpen}
    />
  );
}

function Pill({ children, herb, onPhoto }: { children: string; herb?: boolean; onPhoto: boolean }) {
  return (
    <span
      className={cn(
        "max-w-[120px] truncate rounded-pill px-2.5 py-1 text-xs font-semibold",
        herb ? "bg-herb text-white" : onPhoto ? "bg-surface/92 text-ink" : "bg-cream text-ink ring-1 ring-line",
        onPhoto && "shadow-soft backdrop-blur",
      )}
    >
      {children}
    </span>
  );
}
