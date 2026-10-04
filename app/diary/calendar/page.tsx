"use client";

import { use, useMemo, useState } from "react";
import { BackLink } from "@/components/diary/BackLink";
import { DayPreviewCard } from "@/components/diary/DayPreviewCard";
import { MonthCalendar } from "@/components/diary/MonthCalendar";
import { stagger } from "@/components/diary/stagger";
import { IconButton } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { compareMonths, dayInfos, emptyDayInfo, isValidISODate, monthLabel, monthOf, shiftMonth, streakEndingOn } from "@/lib/diary/stats";
import { loggedDates, useDiary } from "@/lib/stores/diary";
import type { ISODate } from "@/lib/types";
import { cn, todayISO } from "@/lib/utils";

/** How many months back the calendar goes */
const MAX_MONTHS_BACK = 24;

const monthBtn =
  "relative inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-surface transition after:absolute after:-inset-1.5 after:content-[''] hover:bg-cream-deep active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** Figma 3.4 diary calendar. `?d=2026-09-30` opens on that day (from the daily diary). */
export default function DiaryCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d } = use(searchParams);
  const today = todayISO();
  const from = typeof d === "string" && isValidISODate(d) && d <= today ? d : null;

  const entries = useDiary((s) => s.entries);
  const goal = useDiary((s) => s.goals.calories);
  const [selected, setSelected] = useState<ISODate>(from ?? today);
  const [month, setMonth] = useState(() => monthOf(from ?? today));

  const info = useMemo(() => dayInfos(entries, goal), [entries, goal]);
  const logged = useMemo(() => loggedDates(entries), [entries]);
  const current = monthOf(today);
  const canNext = compareMonths(month, current) < 0;
  const canPrev = compareMonths(month, shiftMonth(current, -MAX_MONTHS_BACK)) > 0;
  const back = from && from !== today ? `/diary/${from}` : "/diary";

  function jumpToToday() {
    setSelected(today);
    setMonth(current);
  }

  return (
    <>
      <ScreenHeader
        left={<BackLink href={back} icon="/figma/v2/2014-1669/icon-chev-l.svg" />}
        title="Diary"
        right={
          <IconButton label="Jump to today" onClick={jumpToToday}>
            <img src="/figma/v2/2014-1669/icon-cal.svg" alt="" width={18} height={18} className="block size-[18px]" />
          </IconButton>
        }
      />

      <div className="flex flex-col pb-nav">
        <div className="flex items-center justify-between gap-3 px-5 pt-1.5">
          <h1 className="truncate font-display text-[26px] font-semibold leading-[normal] text-ink" aria-live="polite">
            {monthLabel(month)}
          </h1>
          <div className="flex shrink-0 items-start gap-1.5">
            <button type="button" aria-label="Previous month" title="Previous month" disabled={!canPrev} onClick={() => setMonth((m) => shiftMonth(m, -1))} className={monthBtn}>
              <img src="/figma/v2/2014-1669/icon-chev-l-1.svg" alt="" width={16} height={16} className="block size-4" />
            </button>
            <button type="button" aria-label="Next month" title="Next month" disabled={!canNext} onClick={() => setMonth((m) => shiftMonth(m, 1))} className={cn(monthBtn)}>
              <img src="/figma/v2/2014-1669/icon-chev-r.svg" alt="" width={16} height={16} className="block size-4" />
            </button>
          </div>
        </div>

        <MonthCalendar
          month={month}
          today={today}
          info={info}
          selected={selected}
          onSelect={setSelected}
          className="mx-5 mt-3 animate-fade-up"
          style={stagger(0)}
        />

        <DayPreviewCard
          key={selected}
          info={info.get(selected) ?? emptyDayInfo(selected)}
          today={today}
          streak={streakEndingOn(logged, selected)}
          className="mx-5 mt-3 animate-fade-up"
          style={stagger(1)}
        />
      </div>
    </>
  );
}
