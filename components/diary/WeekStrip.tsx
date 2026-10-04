"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { longDayLabel, WEEKDAY_INITIALS } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, fromISODate } from "@/lib/utils";

/** Mon-Sun day picker. Logged days get a dot; the highlight slides between days. */
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
    <div
      role="tablist"
      aria-label="Pick a day"
      className={cn("grid grid-cols-7 gap-1 rounded-card bg-surface p-2 shadow-card", className)}
      style={style}
    >
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
            aria-label={`${longDayLabel(iso)}${hasLog ? ", meals logged" : ""}`}
            disabled={future}
            onClick={() => onSelect(iso)}
            className="relative flex h-[66px] flex-col items-center justify-center gap-1 rounded-tile transition-transform active:scale-95 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {isSelected && (
              <motion.span
                layoutId="diary-week-highlight"
                className="absolute inset-0 rounded-tile bg-accent shadow-accent"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
              />
            )}
            <span
              className={cn(
                "relative text-[11px] font-semibold",
                isSelected ? "text-white/80" : isToday ? "text-accent" : "text-ink-faint",
              )}
            >
              {WEEKDAY_INITIALS[i]}
            </span>
            <span
              className={cn(
                "relative font-display text-[19px] font-semibold leading-none tabular-nums",
                isSelected ? "text-white" : isToday ? "text-accent" : "text-ink",
              )}
            >
              {fromISODate(iso).getDate()}
            </span>
            <span
              aria-hidden
              className={cn(
                "relative size-1.5 rounded-full transition-colors",
                hasLog ? (isSelected ? "bg-white" : "bg-accent") : "bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
