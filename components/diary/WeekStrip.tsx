"use client";

import type { CSSProperties } from "react";
import { longDayLabel, WEEKDAY_INITIALS } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, fromISODate } from "@/lib/utils";

/** Cell padding (p-2) and gap (gap-1) in px, shared by the grid and the sliding highlight */
const PAD = 8;
const GAP = 4;

/**
 * Mon-Sun day picker. Logged days get a dot; one highlight slides between days with a
 * CSS transform (no shared-layout animation, so it never flies in from a previous page).
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
  const index = days.indexOf(selected);

  return (
    <div
      role="tablist"
      aria-label="Pick a day"
      className={cn("relative grid grid-cols-7 gap-1 rounded-card bg-surface p-2 shadow-card", className)}
      style={style}
    >
      {index >= 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-tile bg-accent shadow-accent transition-transform duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none"
          style={{
            top: PAD,
            bottom: PAD,
            left: PAD,
            width: `calc((100% - ${PAD * 2}px - ${GAP * 6}px) / 7)`,
            transform: `translateX(calc(${index} * (100% + ${GAP}px)))`,
          }}
        />
      )}
      {days.map((iso, i) => {
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
            className="relative flex h-[66px] flex-col items-center justify-center gap-1 rounded-tile transition-transform active:scale-95 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span
              className={cn(
                "text-[11px] font-semibold transition-colors duration-300",
                isSelected ? "text-white/80" : isToday ? "text-accent" : "text-ink-faint",
              )}
            >
              {WEEKDAY_INITIALS[i]}
            </span>
            <span
              className={cn(
                "font-display text-[19px] font-semibold leading-none tabular-nums transition-colors duration-300",
                isSelected ? "text-white" : isToday ? "text-accent" : "text-ink",
              )}
            >
              {fromISODate(iso).getDate()}
            </span>
            <span
              aria-hidden
              className={cn("size-1.5 rounded-full transition-colors duration-300", hasLog ? (isSelected ? "bg-white" : "bg-accent") : "bg-transparent")}
            />
          </button>
        );
      })}
    </div>
  );
}
