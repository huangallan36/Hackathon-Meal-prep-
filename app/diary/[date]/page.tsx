"use client";

import { CalendarClock, CalendarX2, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DaySummary } from "@/components/diary/DaySummary";
import { DayTitle } from "@/components/diary/DayTitle";
import { EntrySheet } from "@/components/diary/EntrySheet";
import { HIT_AREA } from "@/components/diary/hitArea";
import { MealSection } from "@/components/diary/MealSection";
import { stagger } from "@/components/diary/stagger";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { fmt, groupByMeal, isFresh, isValidISODate, MEAL_ORDER, sumNutrition } from "@/lib/diary/stats";
import { useDiaryView } from "@/lib/diary/view";
import { useDiary } from "@/lib/stores/diary";
import type { DiaryEntry } from "@/lib/types";
import { addDays, cn, todayISO } from "@/lib/utils";

/** Newest entry the user logged in the last couple of minutes (the one Sous just added) */
function justLoggedId(entries: DiaryEntry[]): string | undefined {
  let best: DiaryEntry | undefined;
  for (const e of entries) if (isFresh(e, 2) && (!best || e.loggedAt > best.loggedAt)) best = e;
  return best?.id;
}

/** Center an entry row in the phone's scroll container */
function scrollToEntry(id: string) {
  const main = document.getElementById("sous-scroll");
  const el = main?.querySelector<HTMLElement>(`[data-entry-id="${CSS.escape(id)}"]`);
  if (!main || !el) return;
  const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - (main.clientHeight - el.offsetHeight) / 2;
  main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

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
  const valid = isValidISODate(date);
  const isToday = valid && date === today;

  const grouped = groupByMeal(entries, valid ? date : "");
  const dayEntries = MEAL_ORDER.flatMap((m) => grouped[m]);

  // Arriving right after "Log to diary": bring the new meal into view (after the shell's scroll reset)
  const freshId = isToday ? justLoggedId(dayEntries) : undefined;
  useEffect(() => {
    if (!freshId) return;
    const t = window.setTimeout(() => scrollToEntry(freshId), 450);
    return () => window.clearTimeout(t);
  }, [freshId]);

  if (!valid || date > today) {
    const future = valid;
    return (
      <>
        <ScreenHeader title={future ? <DayTitle date={date} /> : "Diary"} back="/diary" />
        <EmptyState
          className="animate-fade-up pb-nav pt-16"
          icon={future ? <CalendarClock className="size-6" /> : <CalendarX2 className="size-6" />}
          title={future ? "That day hasn't happened yet" : "That day doesn't exist"}
          body={future ? "Nothing to see here yet. Today's meals are waiting for you." : "The link looks broken. Head back to your diary to pick a day."}
          action={<ButtonLink href={future ? `/diary/${today}` : "/diary"}>{future ? "Go to today" : "Back to diary"}</ButtonLink>}
        />
      </>
    );
  }

  const totals = sumNutrition(dayEntries);
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
        title={<DayTitle date={date} />}
        subtitle={subtitle}
        back="/diary"
        right={
          <>
            <IconButton label="Previous day" className={HIT_AREA} onClick={() => goDay(-1)}>
              <ChevronLeft className="size-5" />
            </IconButton>
            <IconButton
              label="Next day"
              disabled={!canGoNext}
              onClick={() => goDay(1)}
              className={cn(HIT_AREA, "disabled:pointer-events-none disabled:opacity-35")}
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
