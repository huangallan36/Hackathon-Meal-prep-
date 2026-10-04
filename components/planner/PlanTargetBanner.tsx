"use client";

import { CalendarPlus, X } from "lucide-react";
import { dayPhrase } from "@/lib/planner/format";
import type { ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Pick a recipe for Tuesday" hint while the user is filling an empty day of the week plan */
export function PlanTargetBanner({
  date,
  onCancel,
  className,
}: {
  date: ISODate;
  onCancel: () => void;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("flex items-center gap-3 rounded-tile bg-accent-soft py-1.5 pl-4 pr-1.5 animate-fade-up", className)}
    >
      <CalendarPlus className="size-4 shrink-0 text-accent-strong" />
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-accent-strong">Pick a recipe for {dayPhrase(date)}</p>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Stop planning this day"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-accent-strong transition hover:bg-surface/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
