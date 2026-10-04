"use client";

import Link from "next/link";
import { IconButton } from "@/components/ui/Button";
import { dayHeading, daySubheading, fullDayLabel } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Figma 3.3 date nav: 40px ‹ › circles around "Today" (Bricolage 20) and "Saturday, October 3".
 * The date opens the month calendar (3.4), marked by its small calendar icon.
 */
export function DayHeader({
  date,
  today,
  onPrev,
  onNext,
}: {
  date: ISODate;
  today: ISODate;
  onPrev: () => void;
  onNext: () => void;
}) {
  const canNext = date < today;
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-cream/90 px-5 pb-2 pt-[calc(var(--safe-top)+6px)] backdrop-blur-md">
      <IconButton label="Previous day" onClick={onPrev}>
        <img src="/figma/v2/2014-1536/icon-chev-l.svg" alt="" width={20} height={20} className="block size-5" />
      </IconButton>
      <Link
        href={`/diary/calendar?d=${date}`}
        aria-label={`${fullDayLabel(date, today)}. Open the calendar`}
        className="flex min-w-0 flex-col items-center rounded-tile px-2 leading-[normal] transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <h1 className="truncate font-display text-xl font-semibold text-ink">{dayHeading(date, today)}</h1>
        <span className="flex max-w-full items-center gap-1">
          <span className="truncate text-xs text-ink-soft">{daySubheading(date, today)}</span>
          <img src="/figma/v2/2014-1669/icon-cal.svg" alt="" width={12} height={12} className="block size-3 shrink-0" />
        </span>
      </Link>
      <IconButton
        label="Next day"
        disabled={!canNext}
        onClick={onNext}
        className={cn("disabled:pointer-events-none disabled:opacity-35")}
      >
        <img src="/figma/v2/2014-1536/icon-chev-r.svg" alt="" width={20} height={20} className="block size-5" />
      </IconButton>
    </header>
  );
}
