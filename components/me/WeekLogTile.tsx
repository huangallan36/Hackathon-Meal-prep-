"use client";

import Link from "next/link";
import { DAY_STATUS_LABEL, longDayLabel, weekdayInitial, type DayInfo, type DayStatus } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Figma 3.1 calendar dots (12px): on target green, over amber, nothing logged line; partial = 3.4's dashed dot */
const DOT: Record<DayStatus, string> = {
  "on-target": "/figma/screens/2-155/ellipse-2.svg",
  over: "/figma/screens/2-155/ellipse-3.svg",
  none: "/figma/screens/2-155/ellipse-4.svg",
  partial: "/figma/screens/2-161/ellipse-2.png",
};

/** Figma 3.1 "Calendar" tile: one dot per day of the week, "6 of 7 days logged"; opens the month view */
export function WeekLogTile({
  days,
  info,
  className,
}: {
  days: ISODate[];
  info: Map<ISODate, DayInfo>;
  className?: string;
}) {
  const logged = days.filter((d) => (info.get(d)?.status ?? "none") !== "none").length;
  return (
    <Link
      href="/diary/calendar"
      aria-label={`Calendar: ${logged} of ${days.length} days logged. Open the diary calendar`}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-2.5 rounded-card bg-surface px-4 py-3.5 shadow-card transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <span className="flex items-center gap-1.5">
        <img src="/figma/screens/2-155/icon-cal.svg" alt="" width={16} height={16} className="block size-4 shrink-0" />
        <span className="text-sm font-semibold leading-[normal] text-ink">Calendar</span>
      </span>
      <span className="flex items-start gap-[5px]" aria-hidden>
        {days.map((d) => {
          const status = info.get(d)?.status ?? "none";
          return (
            <span key={d} className="flex flex-col items-center gap-1" title={`${longDayLabel(d)}: ${DAY_STATUS_LABEL[status]}`}>
              <span className="text-micro font-medium leading-[normal] text-ink-soft">{weekdayInitial(d)}</span>
              <img src={DOT[status]} alt="" width={12} height={12} className="block size-3" />
            </span>
          );
        })}
      </span>
      <span className="text-caption leading-[normal] text-ink-soft">
        {logged} of {days.length} days logged
      </span>
    </Link>
  );
}
