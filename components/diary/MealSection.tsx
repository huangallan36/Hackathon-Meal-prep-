"use client";

import type { CSSProperties, ReactNode } from "react";
import { fmt, MEAL_LABEL, sumNutrition } from "@/lib/diary/stats";
import type { DiaryEntry, MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EntryRow } from "./EntryRow";

/** Card titles as in Figma 3.3 ("Snacks" holds every snack of the day) */
const CARD_TITLE: Record<MealType, string> = { ...MEAL_LABEL, snack: "Snacks" };

/**
 * Figma 3.3 meal card: Fraunces title, the meal's kcal ("—" when empty) and a green "+"
 * that opens the add sheet, then one row per food. `empty` renders under the header when
 * nothing is logged (the dinner card's "Log dinner by voice").
 */
export function MealSection({
  meal,
  entries,
  onAdd,
  onOpenEntry,
  empty,
  className,
  style,
}: {
  meal: MealType;
  entries: DiaryEntry[];
  /** Opens the "Add to <meal>" sheet (no "+" without it) */
  onAdd?: (meal: MealType) => void;
  onOpenEntry: (id: string) => void;
  empty?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const total = sumNutrition(entries);
  const has = entries.length > 0;

  return (
    <section
      aria-label={CARD_TITLE[meal]}
      className={cn("animate-fade-up rounded-card bg-surface px-4 shadow-card", has ? "pb-1.5 pt-3" : "py-3", className)}
      style={style}
    >
      <div className={cn("flex items-center gap-2", has && "pb-2")}>
        <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold leading-[normal] text-ink">{CARD_TITLE[meal]}</h2>
        <span className="shrink-0 whitespace-nowrap text-meta font-semibold leading-[normal] tabular-nums text-ink-soft">
          {has ? `${fmt(total.calories)} kcal` : "—"}
        </span>
        {onAdd && (
          <button
            type="button"
            onClick={() => onAdd(meal)}
            aria-label={`Add to ${MEAL_LABEL[meal]}`}
            title={`Add to ${MEAL_LABEL[meal]}`}
            className="relative inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-accent-soft transition after:absolute after:-inset-[9px] after:content-[''] hover:bg-[#d5e6da] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img src="/figma/screens/2-159/icon-plus.svg" alt="" width={14} height={14} className="block size-3.5" />
          </button>
        )}
      </div>

      {has ? (
        <ul>
          {entries.map((e, i) => (
            <li key={e.id} className="animate-fade-up border-t border-line" style={{ animationDelay: `${i * 40}ms` }}>
              <EntryRow entry={e} onOpen={onOpenEntry} />
            </li>
          ))}
        </ul>
      ) : (
        empty
      )}
    </section>
  );
}
