"use client";

import { MascotAvatar } from "@/components/mascot/Mascot";
import { IconButton } from "@/components/ui/Button";
import { usePersona } from "@/lib/voice/persona";
import { cn } from "@/lib/utils";

/** Figma 2.1 header: "Meal planner" (Bricolage 30) and the 40px filter button, bottom-aligned */
export function PlannerHeader({
  filtersOpen,
  filtersActive,
  onFilters,
}: {
  filtersOpen: boolean;
  /** A diet filter from the panel is on (dot on the button) */
  filtersActive: boolean;
  onFilters: () => void;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-[calc(var(--safe-top)+8px)]">
      <h1 className="min-w-0 truncate font-display text-title font-semibold leading-[normal] text-ink">Meal planner</h1>
      <IconButton
        label={filtersOpen ? "Hide filters" : "Filters"}
        aria-expanded={filtersOpen}
        onClick={onFilters}
        className={cn(filtersOpen && "shadow-[inset_0_0_0_1.5px_var(--color-accent)]")}
      >
        <img src="/figma/v2/2014-993/icon-filter.svg" alt="" width={18} height={18} className="block size-[18px]" />
        {filtersActive && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-surface" />}
      </IconButton>
    </header>
  );
}

/**
 * Figma 2.2 voice banner: the sous-chef's 30px avatar and "Leo’s listening. Try “something
 * under 20 minutes”" (13, Medium). It is an AI surface, so it takes the chosen voice's tint
 * (Leo = the design's avocado soft / avocado).
 */
export function ListeningBanner({ className }: { className?: string }) {
  const persona = usePersona();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2.5 rounded-[16px] py-2 pl-2.5 pr-3.5 animate-fade-up", className)}
      style={{ backgroundColor: persona.soft }}
    >
      <MascotAvatar persona={persona} size={30} />
      <p className="min-w-0 flex-1 text-meta font-medium leading-[normal]" style={{ color: persona.tint }}>
        {persona.name}’s listening. Try “something under 20 minutes”
      </p>
    </div>
  );
}
