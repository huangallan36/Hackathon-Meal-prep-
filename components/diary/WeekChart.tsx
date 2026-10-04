"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, longDayLabel, WEEKDAY_INITIALS, weekAverage } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHART_H = 112;

/**
 * Calories per day for one week against the goal line. Single series, so no legend;
 * the selected day is solid and directly labelled. Tapping a column selects that day.
 */
export function WeekChart({
  days,
  kcalByDay,
  goal,
  selected,
  today,
  onSelect,
  className,
  style,
}: {
  days: ISODate[];
  kcalByDay: Record<ISODate, number>;
  goal: number;
  selected: ISODate;
  today: ISODate;
  onSelect: (date: ISODate) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const values = days.map((d) => (Number.isFinite(kcalByDay[d]) ? Math.max(0, kcalByDay[d]) : 0));
  const { avg } = weekAverage(days, kcalByDay, today);
  // Headroom above the tallest bar for its direct label
  const max = Math.max(goal * 1.25, ...values.map((v) => v * 1.18), 1);
  const goalY = (goal / max) * CHART_H;

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionLabel>This week</SectionLabel>
          {avg > 0 ? (
            <p className="mt-1 text-sm text-ink-soft">
              <span className="font-display text-xl font-semibold text-ink">{fmt(avg)}</span> kcal / day avg
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-faint">No meals logged this week</p>
          )}
        </div>
        <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
          <span className="w-4 border-t-2 border-dashed border-ink-faint/60" aria-hidden />
          Goal {fmt(goal)}
        </span>
      </div>

      <div className="relative mt-4" style={{ height: CHART_H + 22 }}>
        {/* Goal line: recessive, behind the bars */}
        <span
          aria-hidden
          className="absolute inset-x-0 border-t-2 border-dashed border-ink-faint/35"
          style={{ bottom: 22 + goalY }}
        />
        <div className="absolute inset-0 grid grid-cols-7 gap-0.5">
          {days.map((d, i) => {
            const v = values[i];
            const isSelected = d === selected;
            const future = d > today;
            const h = v > 0 ? Math.max(6, (v / max) * CHART_H) : 4;
            return (
              <button
                key={d}
                type="button"
                disabled={future}
                onClick={() => onSelect(d)}
                title={v > 0 ? `${longDayLabel(d)}: ${fmt(v)} kcal` : `${longDayLabel(d)}: nothing logged`}
                aria-label={v > 0 ? `${longDayLabel(d)}, ${fmt(v)} kcal` : `${longDayLabel(d)}, nothing logged`}
                aria-pressed={isSelected}
                className="group flex h-full flex-col items-center justify-end focus-visible:outline-none disabled:cursor-default"
              >
                <span className="relative flex w-full flex-1 items-end justify-center">
                  {isSelected && v > 0 && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 animate-fade-up whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink"
                      style={{ bottom: h + 4 }}
                    >
                      {fmt(v)}
                    </span>
                  )}
                  {!future && (
                    <motion.span
                      className={cn(
                        "block w-[62%] max-w-7 rounded-t-[6px] rounded-b-[2px] transition-colors group-focus-visible:ring-2 group-focus-visible:ring-accent",
                        v === 0 ? "bg-cream-deep" : isSelected ? "bg-accent" : "bg-accent/30 group-hover:bg-accent/45",
                      )}
                      initial={{ height: 0 }}
                      animate={{ height: h }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 * i }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1.5 h-4 text-[11px] font-semibold",
                    isSelected ? "text-accent" : d === today ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {WEEKDAY_INITIALS[i]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
