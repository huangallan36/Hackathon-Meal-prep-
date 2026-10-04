"use client";

import type { CSSProperties } from "react";
import { longDayLabel, weekdayInitial } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, fromISODate } from "@/lib/utils";

/**
 * Figma 3.3 week strip: a weekday initial over a 38px day circle. Selected = ink fill,
 * logged = 2px green ring, nothing logged = white with a 1px line, future = disabled.
 */
export function WeekStrip({
  days,
  selected,
  today,
  logged,
  onSelect,
  className,
  style,
}: {
  days: ISODate[];
  selected: ISODate;
  today: ISODate;
  logged: Set<ISODate>;
  onSelect: (date: ISODate) => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div role="tablist" aria-label="Pick a day" className={cn("flex items-start justify-between", className)} style={style}>
      {days.map((iso) => {
        const isSelected = iso === selected;
        const isToday = iso === today;
        const future = iso > today;
        const hasLog = logged.has(iso);
        return (
          <button
            key={iso}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={`${longDayLabel(iso)}${isToday ? ", today" : ""}${hasLog ? ", meals logged" : ""}`}
            disabled={future}
            onClick={() => onSelect(iso)}
            className="group flex flex-col items-center gap-1.5 focus-visible:outline-none disabled:opacity-35"
          >
            <span className={cn("text-caption font-medium leading-[normal]", isToday && !isSelected ? "text-accent" : "text-ink-soft")}>
              {weekdayInitial(iso)}
            </span>
            <span
              className={cn(
                "flex size-[38px] items-center justify-center rounded-full text-sm font-semibold leading-[normal] tabular-nums transition group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-cream",
                isSelected
                  ? "bg-ink text-white"
                  : hasLog
                    ? "border-2 border-accent bg-surface text-ink"
                    : "border border-line bg-surface text-ink-soft",
              )}
            >
              {fromISODate(iso).getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
