"use client";

import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import {
  compareMonths,
  currentStreak,
  longDayLabel,
  longestStreak,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  WEEKDAY_INITIALS,
} from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, fromISODate } from "@/lib/utils";

/** Month grid (Mon start) with logged days filled, today ringed, and the logging streak */
export function MonthCalendar({
  today,
  logged,
  onOpenDay,
  initialMonth,
  className,
  style,
}: {
  today: ISODate;
  logged: Set<ISODate>;
  onOpenDay: (date: ISODate) => void;
  /** Any date inside the month to show first (defaults to today) */
  initialMonth?: ISODate;
  className?: string;
  style?: CSSProperties;
}) {
  const current = monthOf(today);
  const [month, setMonth] = useState(() => monthOf(initialMonth && initialMonth <= today ? initialMonth : today));
  const atCurrent = compareMonths(month, current) >= 0;
  const cells = monthGrid(month);
  const loggedThisMonth = cells.filter((c) => c.inMonth && logged.has(c.iso)).length;
  const streak = currentStreak(logged, today);
  const best = Math.max(streak, longestStreak(logged));

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg font-semibold leading-tight text-ink">{monthLabel(month)}</h2>
          <p className="text-xs text-ink-faint">
            {loggedThisMonth} {loggedThisMonth === 1 ? "day" : "days"} logged
          </p>
        </div>
        <div className="-mr-2 flex shrink-0 items-center">
          <NavButton label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            <ChevronLeft className="size-5" />
          </NavButton>
          <NavButton label="Next month" disabled={atCurrent} onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            <ChevronRight className="size-5" />
          </NavButton>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold text-ink-faint" aria-hidden>
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div key={`${month.year}-${month.month}`} className="mt-1 grid animate-fade-up grid-cols-7 gap-y-0.5">
        {cells.map(({ iso, inMonth }) => {
          const isToday = iso === today;
          const future = iso > today;
          const hasLog = logged.has(iso);
          return (
            <button
              key={iso}
              type="button"
              disabled={future}
              onClick={() => onOpenDay(iso)}
              aria-label={`${longDayLabel(iso)}${hasLog ? ", meals logged" : ""}`}
              className="group flex h-11 items-center justify-center focus-visible:outline-none disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-sm tabular-nums transition group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-accent",
                  future
                    ? "text-ink-faint/60"
                    : hasLog
                      ? "bg-accent-soft font-semibold text-accent-strong"
                      : "text-ink-soft group-hover:bg-cream",
                  !inMonth && "opacity-45",
                  isToday && "font-semibold ring-2 ring-accent ring-offset-2 ring-offset-surface",
                )}
              >
                {fromISODate(iso).getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-tile bg-cream p-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            streak > 0 ? "bg-accent text-white shadow-accent" : "bg-cream-deep text-ink-faint",
          )}
        >
          <Flame className="size-5" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">
            {streak > 0 ? `${streak} ${streak === 1 ? "day" : "days"} in a row` : "Start a new streak today"}
          </p>
          <p className="truncate text-xs text-ink-soft">
            {streak > 0 && !logged.has(today)
              ? "Log a meal today to keep it going"
              : best > 1
                ? `Best streak: ${best} days`
                : "Log a meal with Sous to begin"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-cream active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {children}
    </button>
  );
}
