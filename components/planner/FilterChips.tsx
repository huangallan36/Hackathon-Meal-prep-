"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { FOR_YOU } from "@/lib/planner/profile";
import { capitalize, DIETS, type SearchFilters } from "@/lib/planner/search";
import { cn } from "@/lib/utils";

export const QUICK_MINUTES = 30;

/** Chip toggles that narrow the planner; "For you" = none of them */
const TOGGLES = [
  { id: "quick", label: `Under ${QUICK_MINUTES} min` },
  { id: "protein", label: "High protein" },
  { id: "leftovers", label: "Use up leftovers" },
] as const;

type ToggleId = (typeof TOGGLES)[number]["id"];

function isOn(filters: SearchFilters, id: ToggleId): boolean {
  if (id === "quick") return filters.maxMinutes === QUICK_MINUTES;
  if (id === "protein") return filters.highProtein === true;
  return filters.leftovers === true;
}

function toggled(filters: SearchFilters, id: ToggleId): SearchFilters {
  const on = !isOn(filters, id);
  if (id === "quick") return { ...filters, maxMinutes: on ? QUICK_MINUTES : undefined };
  if (id === "protein") return { ...filters, highProtein: on || undefined };
  return { ...filters, leftovers: on || undefined };
}

/** True when any chip toggle is on (so "For you" is not) */
export function chipFiltersOn(filters: SearchFilters): boolean {
  return TOGGLES.some((t) => isOn(filters, t.id));
}

/**
 * Figma 2.1 chip row: "For you" (selected = ink) clears the toggles; the others narrow every
 * list. The row scrolls sideways under the screen edge, like the design. "For you" is the
 * taste profile (FOR_YOU), named in its tooltip.
 */
export function FilterChips({
  filters,
  onFilters,
  className,
}: {
  filters: SearchFilters;
  onFilters: (next: SearchFilters) => void;
  className?: string;
}) {
  const forYou = !chipFiltersOn(filters);
  return (
    <div role="group" aria-label="Filters" className={cn("no-scrollbar flex gap-2 overflow-x-auto px-5", className)}>
      <ToggleChip
        pressed={forYou}
        title={`Tuned to you: ${FOR_YOU.summary}`}
        onClick={() => onFilters({ ...filters, maxMinutes: undefined, highProtein: undefined, leftovers: undefined })}
      >
        For you
      </ToggleChip>
      {TOGGLES.map((t) => (
        <ToggleChip key={t.id} pressed={isOn(filters, t.id)} onClick={() => onFilters(toggled(filters, t.id))}>
          {t.label}
        </ToggleChip>
      ))}
      <span aria-hidden className="w-3 shrink-0" />
    </div>
  );
}

/** Opened from the header's filter button: diet filters */
export function DietPanel({
  filters,
  onFilters,
  className,
}: {
  filters: SearchFilters;
  onFilters: (next: SearchFilters) => void;
  className?: string;
}) {
  return (
    <div className={cn("px-5 animate-fade-up", className)}>
      <div className="rounded-tile bg-surface p-3 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Diet</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIETS.map((diet) => {
            const on = filters.diet === diet;
            return (
              <ToggleChip key={diet} pressed={on} onClick={() => onFilters({ ...filters, diet: on ? undefined : diet })}>
                {capitalize(diet)}
              </ToggleChip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Active filters while searching (the chip row is hidden there): tap to remove */
export function ActiveFilters({
  filters,
  onFilters,
  className,
}: {
  filters: SearchFilters;
  onFilters: (next: SearchFilters) => void;
  className?: string;
}) {
  const on = TOGGLES.filter((t) => isOn(filters, t.id));
  if (!on.length && !filters.diet) return null;
  return (
    <div className={cn("no-scrollbar flex gap-2 overflow-x-auto px-5", className)}>
      {on.map((t) => (
        <ToggleChip key={t.id} pressed onClick={() => onFilters(toggled(filters, t.id))} removable>
          {t.label}
        </ToggleChip>
      ))}
      {filters.diet && (
        <ToggleChip pressed onClick={() => onFilters({ ...filters, diet: undefined })} removable>
          {capitalize(filters.diet)}
        </ToggleChip>
      )}
    </div>
  );
}

/** Figma chip (13px Medium, 7/12 padding, 33px): white with a 1px line, or ink when selected */
function ToggleChip({
  pressed,
  removable,
  title,
  onClick,
  children,
}: {
  pressed: boolean;
  removable?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={removable ? undefined : pressed}
      aria-label={removable && typeof children === "string" ? `Remove filter: ${children}` : undefined}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border px-3 py-[7px] text-meta font-medium leading-[normal] transition-[background-color,border-color,color,transform] duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        pressed ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink hover:bg-cream-deep",
      )}
    >
      {children}
      {removable && <X aria-hidden className="-mr-0.5 size-3.5 opacity-70" />}
    </button>
  );
}
