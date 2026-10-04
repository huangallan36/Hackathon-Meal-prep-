"use client";

import { DayDiary } from "@/components/diary/DayDiary";
import { todayISO } from "@/lib/utils";

/** Diary tab: today's daily diary (Figma 3.3) */
export default function DiaryPage() {
  const today = todayISO();
  return <DayDiary date={today} today={today} />;
}
