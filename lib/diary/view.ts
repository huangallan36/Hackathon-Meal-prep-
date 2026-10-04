"use client";

/**
 * In-memory Me view state (not persisted, so a reload starts fresh):
 *  - the week shown on Me (3.1) and Highlighted nutrients (3.2), shared between them
 *  - whether the Sous nutrient tip was dismissed ("Not now" lasts for the session)
 */
import { create } from "zustand";
import type { ISODate } from "@/lib/types";
import { addDays } from "@/lib/utils";

interface DiaryViewState {
  /** Last day of the weekly-average window; null = yesterday (the last 7 full days) */
  weekEnd: ISODate | null;
  setWeekEnd: (date: ISODate | null) => void;

  insightDismissed: boolean;
  dismissInsight: () => void;
}

export const useDiaryView = create<DiaryViewState>()((set) => ({
  weekEnd: null,
  setWeekEnd: (weekEnd) => set({ weekEnd }),

  insightDismissed: false,
  dismissInsight: () => set({ insightDismissed: true }),
}));

/** How far back the weekly view can go (weeks) */
export const MAX_WEEKS_BACK = 26;

/** The weekly window's last day: the stored one when it is still valid, else yesterday */
export function effectiveWeekEnd(weekEnd: ISODate | null, today: ISODate): ISODate {
  const latest = addDays(today, -1);
  const earliest = addDays(latest, -7 * MAX_WEEKS_BACK);
  if (!weekEnd || weekEnd > latest || weekEnd < earliest) return latest;
  return weekEnd;
}
