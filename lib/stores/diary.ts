"use client";

/**
 * Personal food diary. Seed entries are regenerated relative to today on every new day
 * (so the demo always looks current); entries logged through the AI flow are kept.
 * Everything coming in (addEntry/updateEntry callers, localStorage) is sanitized, so
 * the Diary never renders NaN or crashes on a malformed entry.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_GOALS, storageKey } from "@/lib/config";
import { cleanEntryFields, reviveActivity, reviveEntries, reviveGoals } from "@/lib/diary/sanitize";
import { SEED_VERSION, seedActivity, seedDiary } from "@/lib/seed/diary";
import { persistStorage } from "@/lib/storage";
import type { DailyActivity, DiaryEntry, ISODate, Micros, Nutrition, NutritionGoals } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

interface DiaryState {
  entries: DiaryEntry[];
  activity: Record<ISODate, DailyActivity>;
  goals: NutritionGoals;
  /** The local date the seed data was generated for */
  seededFor: ISODate;
  /** Seed generator version the persisted seed came from */
  seedVersion: number;

  addEntry: (entry: Omit<DiaryEntry, "id" | "loggedAt"> & { loggedAt?: number }) => DiaryEntry;
  updateEntry: (id: string, patch: Partial<DiaryEntry>) => void;
  removeEntry: (id: string) => void;
}

function freshSeed() {
  const today = todayISO();
  return { entries: seedDiary(today), activity: seedActivity(today), seededFor: today, seedVersion: SEED_VERSION };
}

export const useDiary = create<DiaryState>()(
  persist(
    (set) => ({
      ...freshSeed(),
      goals: { ...DEFAULT_GOALS },

      addEntry: (entry) => {
        const loggedAt = typeof entry.loggedAt === "number" && Number.isFinite(entry.loggedAt) ? entry.loggedAt : Date.now();
        const full: DiaryEntry = { ...entry, ...cleanEntryFields(entry), id: uid("d"), loggedAt };
        set((s) => ({ entries: [...s.entries, full] }));
        return full;
      },
      updateEntry: (id, patch) => {
        const clean = cleanEntryFields(patch);
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...clean, id: e.id } : e)) }));
      },
      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    {
      name: storageKey("diary"),
      storage: persistStorage,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Record<keyof DiaryState, unknown>>;
        const entries = reviveEntries(p.entries);
        const goals = reviveGoals(p.goals);
        if (p.seededFor === todayISO() && p.seedVersion === SEED_VERSION) {
          return { ...current, entries, goals, activity: reviveActivity(p.activity) ?? current.activity, seededFor: todayISO(), seedVersion: SEED_VERSION };
        }
        // New day (or new seed): refresh seed data, keep everything the user logged.
        const seed = freshSeed();
        const userEntries = entries.filter((e) => e.source !== "seed");
        return { ...current, ...seed, goals, entries: [...seed.entries, ...userEntries] };
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Selectors (pure; call with state from the hook)                     */
/* ------------------------------------------------------------------ */

export function entriesOn(entries: DiaryEntry[], date: ISODate): DiaryEntry[] {
  return entries.filter((e) => e.date === date).sort((a, b) => a.loggedAt - b.loggedAt);
}

export function totalsOn(entries: DiaryEntry[], date: ISODate): Nutrition & Micros {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 0, vitaminA: 0 };
  for (const e of entries) {
    if (e.date !== date) continue;
    t.calories += e.nutrition.calories;
    t.protein += e.nutrition.protein;
    t.carbs += e.nutrition.carbs;
    t.fat += e.nutrition.fat;
    t.fiber += e.nutrition.fiber;
    t.iron += e.micros?.iron ?? 0;
    t.calcium += e.micros?.calcium ?? 0;
    t.vitaminA += e.micros?.vitaminA ?? 0;
  }
  return t;
}

export function loggedDates(entries: DiaryEntry[]): Set<ISODate> {
  return new Set(entries.map((e) => e.date));
}

/** Epoch ms of the most recent entry the user logged (not seed); 0 when none */
export function lastUserLogAt(entries: DiaryEntry[]): number {
  let latest = 0;
  for (const e of entries) if (e.source !== "seed" && e.loggedAt > latest) latest = e.loggedAt;
  return latest;
}
