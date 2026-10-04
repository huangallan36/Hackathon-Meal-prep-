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
  const overlay = pair ? (
    <span className="absolute inset-x-2.5 bottom-2.5 flex flex-wrap items-center gap-1">
      {anchor && <Pill>{capitalize(anchor)}</Pill>}
      {anchor && (
        <span aria-hidden className="inline-flex size-5 items-center justify-center rounded-full bg-ink/55 text-white backdrop-blur">
          <Plus className="size-3" strokeWidth={3} />
        </span>
      )}
      <Pill tone={fromFridge ? "herb" : "light"}>{capitalize(pair)}</Pill>
    </span>
  ) : null;

  return <RecipeTile recipe={recipe} index={index} wide={wide} overlay={overlay} onOpen={onOpen} />;
}

function Pill({ children, tone = "light" }: { children: string; tone?: "light" | "herb" }) {
  return (
    <span
      className={cn(
        "max-w-[120px] truncate rounded-pill px-2.5 py-1 text-xs font-semibold shadow-soft backdrop-blur",
        tone === "herb" ? "bg-herb text-white" : "bg-surface/92 text-ink",
      )}
    >
      {children}
    </span>
  );
}
