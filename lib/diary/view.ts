"use client";

/**
 * In-memory Diary view state: the day selected on /diary, so coming back from
 * /diary/[date] lands on the same week. Not persisted.
 */
import { create } from "zustand";
import type { ISODate } from "@/lib/types";

interface DiaryViewState {
  /** null = today */
  selected: ISODate | null;
  /** epoch ms of the selection, so a newer logged meal can snap the view back to today */
  selectedAt: number;
  select: (date: ISODate | null) => void;
}

export const useDiaryView = create<DiaryViewState>()((set) => ({
  selected: null,
  selectedAt: 0,
  select: (selected) => set({ selected, selectedAt: Date.now() }),
}));

/**
 * The day /diary should show: the remembered selection, unless it is in the future
 * or the user logged a meal after picking it (then today, so the new meal is visible).
 */
export function effectiveSelection(selected: ISODate | null, selectedAt: number, today: ISODate, lastLogAt: number): ISODate {
  if (!selected || selected > today || lastLogAt > selectedAt) return today;
  return selected;
}
