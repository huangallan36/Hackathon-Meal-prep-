"use client";

import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { DAY_STATUS_LABEL, longDayLabel, monthGrid, WEEKDAY_INITIALS, type DayInfo, type DayStatus, type MonthRef } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, fromISODate } from "@/lib/utils";

/** Figma 3.4 day circles by status */
const STATUS_CELL: Record<DayStatus, string> = {
  "on-target": "bg-accent-soft text-accent",
  over: "bg-butter-soft text-butter-ink",
  partial: "border-[1.5px] border-dashed border-accent text-accent",
  none: "text-ink-mute",
};

const LEGEND: { label: string; dot: string }[] = [
  { label: "On target", dot: "/figma/v2/2014-1669/ellipse.svg" },
  { label: "Over", dot: "/figma/v2/2014-1669/ellipse-1.svg" },
  { label: "Partial", dot: "/figma/v2/2014-1669/ellipse-2.png" },
];

/**
 * Figma 3.4 month grid (Sunday start): 36px day circles colored by how the day went,
 * the selected day filled ink, future days disabled, and the legend underneath.
 */
export function MonthCalendar({
  month,
  today,
  info,
  selected,
  onSelect,
  className,
  style,
}: {
  month: MonthRef;
  today: ISODate;
  info: Map<ISODate, DayInfo>;
  selected: ISODate;
  onSelect: (date: ISODate) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const cells = monthGrid(month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <Card className={cn("flex flex-col gap-1.5 px-2.5 py-4", className)} style={style}>
      <div className="flex" aria-hidden>
        {WEEKDAY_INITIALS.map((d, i) => (
          <span key={i} className="flex-1 text-center text-caption font-semibold leading-[normal] text-ink-soft">
            {d}
          </span>
        ))}
      </div>

      <div key={`${month.year}-${month.month}`} role="grid" aria-label="Days" className="flex animate-fade-up flex-col gap-1.5">
        {weeks.map((week, w) => (
          <div key={w} role="row" className="flex">
            {week.map(({ iso, inMonth }) => {
              if (!inMonth) return <span key={iso} role="gridcell" className="flex-1 py-[3px]" aria-hidden><span className="block size-9" /></span>;
              const status = info.get(iso)?.status ?? "none";
              const future = iso > today;
              const isSelected = iso === selected;
              return (
                <span key={iso} role="gridcell" className="flex flex-1 justify-center py-[3px]">
                  <button
                    type="button"
                    disabled={future}
                    aria-pressed={isSelected}
                    aria-label={`${longDayLabel(iso)}${iso === today ? ", today" : ""}: ${future ? "upcoming" : DAY_STATUS_LABEL[status]}`}
                    onClick={() => onSelect(iso)}
                    className={cn(
                      "relative flex size-9 items-center justify-center rounded-full text-sm leading-[normal] tabular-nums transition after:absolute after:-inset-1 after:content-[''] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-default",
                      isSelected ? "bg-ink font-bold text-white" : future ? "font-medium text-ink-mute/60" : cn("font-medium", STATUS_CELL[status]),
                    )}
                  >
                    {fromISODate(iso).getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="flex items-start justify-center gap-3.5 pt-1.5">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <img src={l.dot} alt="" width={12} height={12} className="block size-3" />
            <span className="text-caption font-medium leading-[normal] text-ink-soft">{l.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
