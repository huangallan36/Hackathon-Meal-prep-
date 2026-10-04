"use client";

import { ChevronLeft, ChevronRight, Flame, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActivityRow } from "@/components/diary/ActivityRow";
import { CalorieRing } from "@/components/diary/CalorieRing";
import { MacroBars } from "@/components/diary/MacroBars";
import { MealsPreview } from "@/components/diary/MealsPreview";
import { MonthCalendar } from "@/components/diary/MonthCalendar";
import { NutrientGrid } from "@/components/diary/NutrientGrid";
import { stagger } from "@/components/diary/stagger";
import { WeekStrip } from "@/components/diary/WeekStrip";
import { IconButton } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { currentStreak, dayTotals, formatWeekRange, longDayLabel, relativeDayLabel } from "@/lib/diary/stats";
import { effectiveSelection, useDiaryView } from "@/lib/diary/view";
import { lastUserLogAt, loggedDates, useDiary } from "@/lib/stores/diary";
import type { ISODate } from "@/lib/types";
import { addDays, todayISO, weekRange } from "@/lib/utils";

export default function DiaryPage() {
  const router = useRouter();
  const entries = useDiary((s) => s.entries);
  const activity = useDiary((s) => s.activity);
  const goals = useDiary((s) => s.goals);
  const remembered = useDiaryView((s) => s.selected);
  const rememberedAt = useDiaryView((s) => s.selectedAt);
  const select = useDiaryView((s) => s.select);

  const today = todayISO();
  const selected = effectiveSelection(remembered, rememberedAt, today, lastUserLogAt(entries));
  const week = weekRange(selected);
  const isCurrentWeek = week.end >= today;

  const logged = loggedDates(entries);
  const { totals, microsEstimated } = dayTotals(entries, selected);
  const streak = currentStreak(logged, today);
  const dayActivity = activity[selected];

  function shiftWeek(delta: number) {
    const next = addDays(selected, delta * 7);
    select(next > today ? today : next);
  }

  function openDay(iso: ISODate) {
    select(iso);
    router.push(`/diary/${iso}`);
  }

  return (
    <>
      <ScreenHeader
        title="Diary"
        subtitle={formatWeekRange(week.start, week.end)}
        right={
          <>
            <IconButton label="Previous week" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <IconButton
              label="Next week"
              disabled={isCurrentWeek}
              onClick={() => shiftWeek(1)}
              className="disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="size-5" />
            </IconButton>
          </>
        }
      />

      <div className="flex flex-col gap-4 px-5 pb-nav pt-1">
        <WeekStrip
          days={week.days}
          selected={selected}
          today={today}
          logged={logged}
          onSelect={(d) => select(d)}
          className="animate-fade-up"
          style={stagger(0)}
        />

        <div className="flex animate-fade-up items-end justify-between gap-3 px-1 pt-1" style={stagger(1)}>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {selected === today || selected === addDays(today, -1) ? longDayLabel(selected) : "Looking back"}
            </p>
            <h2 className="truncate font-display text-[26px] font-semibold leading-tight text-ink">{relativeDayLabel(selected, today)}</h2>
          </div>
          {selected !== today ? (
            <button
              type="button"
              onClick={() => select(null)}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill bg-surface px-4 text-sm font-semibold text-ink shadow-soft transition active:scale-95"
            >
              <RotateCcw className="size-4" />
              Today
            </button>
          ) : (
            streak > 0 && (
              <span className="inline-flex h-9 shrink-0 animate-pop items-center gap-1.5 rounded-pill bg-accent-soft px-3 text-sm font-semibold text-accent-strong">
                <Flame className="size-4" />
                {streak}-day streak
              </span>
            )
          )}
        </div>

        <CalorieRing
          consumed={totals.calories}
          goal={goals.calories}
          burned={dayActivity?.exerciseKcal}
          className="animate-fade-up"
          style={stagger(2)}
        />
        <MealsPreview date={selected} today={today} entries={entries} className="animate-fade-up" style={stagger(3)} />
        <MacroBars totals={totals} goals={goals} className="animate-fade-up" style={stagger(4)} />
        <NutrientGrid totals={totals} goals={goals} estimated={microsEstimated} className="animate-fade-up" style={stagger(5)} />
        <ActivityRow activity={dayActivity} className="animate-fade-up" style={stagger(6)} />
        <MonthCalendar
          key={selected.slice(0, 7)}
          today={today}
          logged={logged}
          initialMonth={selected}
          onOpenDay={openDay}
          className="animate-fade-up"
          style={stagger(7)}
        />
      </div>
    </>
  );
}
