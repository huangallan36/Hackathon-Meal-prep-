"use client";

import { CalendarX2, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { DaySummary } from "@/components/diary/DaySummary";
import { EntrySheet } from "@/components/diary/EntrySheet";
import { MealSection } from "@/components/diary/MealSection";
import { stagger } from "@/components/diary/stagger";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { fmt, groupByMeal, isValidISODate, longDayLabel, MEAL_ORDER, sumNutrition } from "@/lib/diary/stats";
import { useDiaryView } from "@/lib/diary/view";
import { useDiary } from "@/lib/stores/diary";
import { addDays, todayISO } from "@/lib/utils";

export default function DailyDiaryPage() {
  const params = useParams<{ date: string }>();
  const router = useRouter();
  const entries = useDiary((s) => s.entries);
  const goals = useDiary((s) => s.goals);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setOpenId(null), []);

  const raw = params?.date;
  const date = Array.isArray(raw) ? raw[0] : raw;
  const today = todayISO();

  if (!isValidISODate(date)) {
    return (
      <>
        <ScreenHeader title="Diary" back="/diary" />
        <EmptyState
          className="pb-nav pt-16"
          icon={<CalendarX2 className="size-6" />}
          title="That day doesn't exist"
          body="The link looks broken. Head back to your diary to pick a day."
          action={<ButtonLink href="/diary">Back to diary</ButtonLink>}
        />
      </>
    );
  }

  const grouped = groupByMeal(entries, date);
  const dayEntries = MEAL_ORDER.flatMap((m) => grouped[m]);
  const totals = sumNutrition(dayEntries);
  const isToday = date === today;
  const canGoNext = date < today;
  const openEntry = openId ? dayEntries.find((e) => e.id === openId) : undefined;

  function goDay(delta: number) {
    const next = addDays(date as string, delta);
    if (next > today) return;
    setOpenId(null);
    useDiaryView.getState().select(next);
    router.replace(`/diary/${next}`);
  }

  const relative = isToday ? "Today" : date === addDays(today, -1) ? "Yesterday" : null;
  const count = dayEntries.length;
  const subtitle = [relative, count ? `${count} ${count === 1 ? "entry" : "entries"} · ${fmt(totals.calories)} kcal` : "Nothing logged"]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ScreenHeader
        title={longDayLabel(date)}
        subtitle={subtitle}
        back="/diary"
        right={
          <>
            <IconButton label="Previous day" onClick={() => goDay(-1)}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <IconButton
              label="Next day"
              disabled={!canGoNext}
              onClick={() => goDay(1)}
              className="disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="size-5" />
            </IconButton>
          </>
        }
      />

      <div key={date} className="flex flex-col gap-6 px-5 pb-nav pt-1">
        <DaySummary totals={totals} goals={goals} className="animate-fade-up" style={stagger(0)} />

        {MEAL_ORDER.map((meal, i) => (
          <MealSection
            key={meal}
            meal={meal}
            entries={grouped[meal]}
            canAdd={isToday}
            onOpenEntry={setOpenId}
            style={stagger(i + 1)}
          />
        ))}

        {isToday && (
          <Link
            href="/ai/snap"
            className="flex animate-fade-up items-center gap-4 rounded-card bg-surface p-4 shadow-card transition active:scale-[0.99]"
            style={stagger(5)}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-accent">
              <Camera className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[17px] font-semibold text-ink">Snap a meal</span>
              <span className="block text-sm text-ink-soft">Sous estimates calories and macros from a photo.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-ink-faint" />
          </Link>
        )}
      </div>

      <EntrySheet entry={openEntry} onClose={closeSheet} />
    </>
  );
}
