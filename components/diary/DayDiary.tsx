"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { dayTotals, groupByMeal, isFresh, MEAL_ORDER, stripDays, sumNutrition } from "@/lib/diary/stats";
import { loggedDates, useDiary } from "@/lib/stores/diary";
import type { DiaryEntry, ISODate, MealType } from "@/lib/types";
import { addDays } from "@/lib/utils";
import { AddFoodSheet } from "./AddFoodSheet";
import { DayHeader } from "./DayHeader";
import { DaySummary } from "./DaySummary";
import { EntrySheet } from "./EntrySheet";
import { MascotNote } from "./MascotNote";
import { MealSection } from "./MealSection";
import { NutrientsSection } from "./NutrientsSection";
import { stagger } from "./stagger";
import { VoiceLogButton } from "./VoiceLogButton";
import { WeekStrip } from "./WeekStrip";

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

/** Bring a section (e.g. #nutrients) to the top, just under the sticky header */
function scrollToSection(id: string) {
  const main = document.getElementById("sous-scroll");
  const el = document.getElementById(id);
  if (!main || !el) return;
  const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 76;
  main.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

const wantsNutrients = () => typeof window !== "undefined" && window.location.hash === "#nutrients";

/**
 * Figma 3.3 daily diary for one (valid, not future) day: date nav, week strip, Eaten /
 * Burned / Left rings, the four meal cards (an empty dinner has the sous-chef's note and
 * "Log dinner" by voice), then the day's nutrients. Entry rows open the details sheet.
 */
export function DayDiary({ date, today }: { date: ISODate; today: ISODate }) {
  const router = useRouter();
  const entries = useDiary((s) => s.entries);
  const goals = useDiary((s) => s.goals);
  const activity = useDiary((s) => s.activity);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeSheet = useCallback(() => setOpenId(null), []);
  // "Add to <meal>" sheet; the meal stays set while it animates closed
  const [adding, setAdding] = useState<{ meal: MealType; open: boolean }>({ meal: "breakfast", open: false });
  const openAdd = useCallback((meal: MealType) => setAdding({ meal, open: true }), []);
  const closeAdd = useCallback(() => setAdding((a) => ({ ...a, open: false })), []);

  const grouped = groupByMeal(entries, date);
  const dayEntries = MEAL_ORDER.flatMap((m) => grouped[m]);
  const totals = sumNutrition(dayEntries);
  const nutrients = dayTotals(dayEntries, date);
  const logged = loggedDates(entries);
  const openEntry = openId ? dayEntries.find((e) => e.id === openId) : undefined;

  // Arriving right after "Log to diary": bring the new meal into view (after the shell's scroll reset)
  const freshId = date === today ? justLoggedId(dayEntries) : undefined;
  useEffect(() => {
    if (!freshId || wantsNutrients()) return;
    const t = window.setTimeout(() => scrollToEntry(freshId), 450);
    return () => window.clearTimeout(t);
  }, [freshId]);

  // /diary/<date>#nutrients
  useEffect(() => {
    if (!wantsNutrients()) return;
    const t = window.setTimeout(() => scrollToSection("nutrients"), 450);
    return () => window.clearTimeout(t);
  }, [date]);

  function go(next: ISODate) {
    if (next > today || next === date) return;
    setOpenId(null);
    router.replace(next === today ? "/diary" : `/diary/${next}`);
  }

  return (
    <>
      <DayHeader date={date} today={today} onPrev={() => go(addDays(date, -1))} onNext={() => go(addDays(date, 1))} />

      <div key={date} className="flex flex-col pb-nav">
        <WeekStrip
          days={stripDays(date, today)}
          selected={date}
          today={today}
          logged={logged}
          onSelect={go}
          className="animate-fade-up px-5 pt-1.5"
          style={stagger(0)}
        />

        <div className="px-5 pt-3.5">
          <DaySummary
            eaten={totals.calories}
            burned={activity[date]?.exerciseKcal ?? 0}
            goal={goals.calories}
            className="animate-fade-up"
            style={stagger(1)}
          />
        </div>

        <div className="flex flex-col gap-2.5 px-5 pt-3.5">
          {MEAL_ORDER.map((meal, i) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={grouped[meal]}
              onAdd={openAdd}
              onOpenEntry={setOpenId}
              style={stagger(i + 2)}
              empty={
                meal === "dinner" ? (
                  <>
                    <MascotNote className="pt-2.5">Nothing yet. Tap below and tell me what you ate.</MascotNote>
                    <VoiceLogButton meal="dinner" date={date} onFallback={() => openAdd("dinner")} className="pt-2.5" />
                  </>
                ) : undefined
              }
            />
          ))}
        </div>

        {nutrients.count > 0 && <NutrientsSection result={nutrients} goals={goals} className="px-5 pt-7" style={stagger(6)} />}
      </div>

      <EntrySheet entry={openEntry} onClose={closeSheet} />
      <AddFoodSheet open={adding.open} meal={adding.meal} date={date} onClose={closeAdd} />
    </>
  );
}
