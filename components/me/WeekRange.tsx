"use client";

import { formatWeekRange } from "@/lib/diary/stats";
import { effectiveWeekEnd, MAX_WEEKS_BACK, useDiaryView } from "@/lib/diary/view";
import type { ISODate } from "@/lib/types";
import { addDays, cn, todayISO } from "@/lib/utils";

/**
 * The weekly window shared by Me (3.1) and Highlighted nutrients (3.2): the 7 days ending
 * `end` (yesterday by default: the last 7 full days), with ‹ › to step a week at a time.
 */
export function useWeekWindow() {
  const stored = useDiaryView((s) => s.weekEnd);
  const setWeekEnd = useDiaryView((s) => s.setWeekEnd);
  const today = todayISO();
  const end = effectiveWeekEnd(stored, today);
  const start = addDays(end, -6);
  const latest = addDays(today, -1);
  const canNext = end < latest;
  const canPrev = end > addDays(latest, -7 * MAX_WEEKS_BACK);
  return {
    today,
    start,
    end,
    canPrev,
    canNext,
    prev: () => canPrev && setWeekEnd(addDays(end, -7)),
    next: () => {
      if (!canNext) return;
      const n = addDays(end, 7);
      setWeekEnd(n >= latest ? null : n);
    },
  };
}

/** Figma week pill: white, 1px line, "‹ Sep 26 – Oct 2 ›" (13px semibold, 16px chevrons) */
export function WeekRangePill({
  start,
  end,
  canPrev,
  canNext,
  onPrev,
  onNext,
  chevLeft,
  chevRight,
  className,
}: {
  start: ISODate;
  end: ISODate;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** The screen's own 16px chevron assets */
  chevLeft: string;
  chevRight: string;
  className?: string;
}) {
  const btn =
    "relative inline-flex size-4 shrink-0 items-center justify-center rounded-full transition after:absolute after:-inset-3 after:content-[''] active:scale-90 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <div className={cn("inline-flex shrink-0 items-center gap-2.5 rounded-pill border border-line bg-surface px-2 py-1.5", className)}>
      <button type="button" aria-label="Previous week" title="Previous week" disabled={!canPrev} onClick={onPrev} className={btn}>
        <img src={chevLeft} alt="" width={16} height={16} className="block size-4" />
      </button>
      <p className="whitespace-nowrap text-meta font-semibold leading-[normal] text-ink" aria-live="polite">
        {formatWeekRange(start, end)}
      </p>
      <button type="button" aria-label="Next week" title="Next week" disabled={!canNext} onClick={onNext} className={btn}>
        <img src={chevRight} alt="" width={16} height={16} className="block size-4" />
      </button>
    </div>
  );
}
