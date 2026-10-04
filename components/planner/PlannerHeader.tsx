"use client";

import { IconButton } from "@/components/ui/Button";
import { FOR_YOU } from "@/lib/planner/profile";
import { useAssistantName, usePersona } from "@/lib/voice/persona";
import { cn } from "@/lib/utils";

/** Figma 2.1 header: "Meal planner" (Fraunces 30), the "Tuned to you" pill, and the filter button */
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
    <header className="flex items-start justify-between gap-3 px-5 pt-[calc(var(--safe-top)+8px)]">
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <h1 className="font-display text-title font-semibold leading-[normal] text-ink">Meal planner</h1>
        <p className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1">
          <img src="/figma/screens/2-146/icon-sparkle.svg" alt="" width={12} height={12} className="block size-3 shrink-0" />
          <span className="truncate text-caption font-medium leading-[normal] text-accent">Tuned to you · {FOR_YOU.summary}</span>
        </p>
      </div>
      <IconButton
        label={filtersOpen ? "Hide filters" : "Filters"}
        aria-expanded={filtersOpen}
        onClick={onFilters}
        className={cn(filtersOpen && "shadow-[inset_0_0_0_1.5px_var(--color-accent)]")}
      >
        <img src="/figma/screens/2-146/icon-filter.svg" alt="" width={18} height={18} className="block size-[18px]" />
        {filtersActive && <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-accent ring-2 ring-surface" />}
      </IconButton>
    </header>
  );
}

/** Figma 2.2 voice banner: "<Name> is listening — try “something under 20 minutes”" */
export function ListeningBanner({ className }: { className?: string }) {
  const name = useAssistantName();
  const persona = usePersona();
  // The design's orb is Maya's; the other sous-chefs show their own.
  const orb = persona.id === "maya" ? "/figma/screens/2-148/voice-orb.svg" : persona.orb;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-2.5 rounded-[16px] bg-accent-soft py-2 pl-2.5 pr-3.5 animate-fade-up", className)}
    >
      <img src={orb} alt="" width={30} height={30} className="block size-[30px] shrink-0 animate-pulse" />
      <p className="min-w-0 flex-1 text-meta font-medium leading-[normal] text-accent">
        {name} is listening — try “something under 20 minutes”
      </p>
    </div>
  );
}
