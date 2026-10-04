"use client";

import { CalendarClock, CalendarX2 } from "lucide-react";
import { useParams } from "next/navigation";
import { DayDiary } from "@/components/diary/DayDiary";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { fullDayLabel, isValidISODate } from "@/lib/diary/stats";
import { todayISO } from "@/lib/utils";

/** One day of the diary (Figma 3.3), e.g. /diary/2026-09-30 from the calendar */
export default function DailyDiaryPage() {
  const params = useParams<{ date: string }>();
  const raw = params?.date;
  const date = Array.isArray(raw) ? raw[0] : raw;
  const today = todayISO();

  if (!isValidISODate(date) || date > today) {
    const future = isValidISODate(date);
    return (
      <>
        <ScreenHeader title={future ? fullDayLabel(date, today) : "Diary"} back="/diary" />
        <EmptyState
          className="animate-fade-up pb-nav pt-16"
          icon={future ? <CalendarClock className="size-6" /> : <CalendarX2 className="size-6" />}
          title={future ? "That day hasn't happened yet" : "That day doesn't exist"}
          body={future ? "Nothing to see here yet. Today's meals are waiting for you." : "The link looks broken. Head back to your diary to pick a day."}
          action={<ButtonLink href="/diary">{future ? "Go to today" : "Back to diary"}</ButtonLink>}
        />
      </>
    );
  }

  return <DayDiary date={date} today={today} />;
}
