"use client";

import { Check, Leaf, Timer } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
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
  const rowRef = useRef<HTMLDivElement>(null);

  // Slide the active query chip into view (e.g. "Rice" picked from an empty state or typed).
  // Only the chip row scrolls horizontally; the page itself never moves.
  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>('[data-query-chip][aria-pressed="true"]');
    if (!row || !chip) return;
    // The row is `relative`, so offsetLeft is measured from the row's own edge.
    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left >= row.scrollLeft && right <= row.scrollLeft + row.clientWidth) return;
    row.scrollTo({ left: Math.max(0, left - row.clientWidth / 2 + chip.offsetWidth / 2), behavior: "smooth" });
  }, [activeQuery]);

  return (
    <div ref={rowRef} className="no-scrollbar relative -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1.5">
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
          <ChipButton key={chip} pressed={active} queryChip onClick={() => onQuery(active ? "" : chip)}>
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
  queryChip,
  onClick,
  children,
}: {
  pressed: boolean;
  icon?: ReactNode;
  /** Marks chips that set the query (auto-scrolled into view when active) */
  queryChip?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-query-chip={queryChip || undefined}
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
