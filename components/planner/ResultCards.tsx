"use client";

import type { ComboGroup, IngredientChip } from "@/lib/planner/search";
import { cn } from "@/lib/utils";
import { Plate } from "./Plate";
import { stagger } from "./RecipeMeta";

/** Figma 2.2 "Cuts" chip: 32px round ingredient photo + name (13); selected = ink */
export function CutChip({
  chip,
  index,
  selected,
  onClick,
}: {
  chip: IngredientChip;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={stagger(index, 35)}
      className={cn(
        "inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-pill border py-1 pl-1 pr-3.5 text-meta font-medium leading-[normal] animate-fade-up transition-[background-color,border-color,color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-cream-deep",
      )}
    >
      <Plate slot="cut" index={index} size={32} src={chip.image} />
      {chip.label}
    </button>
  );
}

/**
 * Figma 2.2 "Combinations" card (140 wide, radius 18): the query ingredient's 52px photo with
 * the partner's overlapping it (white 3px ring), "Beef + Broccoli" (14), "14 recipes" (12).
 */
export function ComboCard({ group, index, onClick }: { group: ComboGroup; index: number; onClick: () => void }) {
  const count = group.recipes.length;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${group.title}, ${count} ${count === 1 ? "recipe" : "recipes"}`}
      style={stagger(index)}
      className="flex w-[140px] shrink-0 snap-start flex-col items-start gap-2.5 rounded-tile border border-line bg-surface p-3 text-left animate-fade-up transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span aria-hidden className="relative block h-[52px] w-[84px] shrink-0">
        <span className="absolute left-0 top-0">
          <Plate slot="comboAnchor" size={52} src={group.anchorImage} />
        </span>
        <span className="absolute left-8 top-0">
          <Plate slot="comboPair" index={index} size={52} src={group.pairImage} ring />
        </span>
      </span>
      <span className="flex w-full min-w-0 flex-col gap-0.5 leading-[normal]">
        <span className="truncate text-sm font-semibold text-ink">{group.title}</span>
        <span className="truncate text-xs text-ink-soft">
          {count} {count === 1 ? "recipe" : "recipes"}
        </span>
      </span>
    </button>
  );
}
