"use client";

import { Check, Leaf, Timer } from "lucide-react";
import type { ReactNode } from "react";
import type { SearchFilters } from "@/lib/planner/search";
import { cn } from "@/lib/utils";

export const QUICK_MINUTES = 30;

/**
 * One scroller, two kinds of chips: toggles ("Under 30 min", "Vegetarian") narrow every
 * result; ingredient chips ("Chicken") set the search query.
 */
export function FilterChips({
  filters,
  onFilters,
  queryChips,
  activeQuery,
  onQuery,
}: {
  filters: SearchFilters;
  onFilters: (next: SearchFilters) => void;
  queryChips: string[];
  /** Normalized current query, to highlight its chip */
  activeQuery: string;
  onQuery: (query: string) => void;
}) {
  const quick = filters.maxMinutes === QUICK_MINUTES;
  const veg = filters.diet === "vegetarian";
  return (
    <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1.5">
      <ChipButton
        pressed={quick}
        icon={<Timer className="size-4" />}
        onClick={() => onFilters({ ...filters, maxMinutes: quick ? undefined : QUICK_MINUTES })}
      >
        Under {QUICK_MINUTES} min
      </ChipButton>
      <ChipButton
        pressed={veg}
        icon={<Leaf className="size-4" />}
        onClick={() => onFilters({ ...filters, diet: veg ? undefined : "vegetarian" })}
      >
        Vegetarian
      </ChipButton>
      <span aria-hidden className="mx-1 my-auto h-5 w-px shrink-0 bg-line" />
      {queryChips.map((chip) => {
        const active = activeQuery === chip.toLowerCase();
        return (
          <ChipButton key={chip} pressed={active} onClick={() => onQuery(active ? "" : chip)}>
            {chip}
          </ChipButton>
        );
      })}
      <span aria-hidden className="w-0 shrink-0" />
    </div>
  );
}

function ChipButton({
  pressed,
  icon,
  onClick,
  children,
}: {
  pressed: boolean;
  icon?: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        pressed ? "bg-ink text-white shadow-soft" : "bg-surface text-ink ring-1 ring-line hover:bg-cream-deep",
      )}
    >
      {pressed && icon ? <Check className="size-4" /> : icon}
      {children}
    </button>
  );
}
