"use client";

import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { MEAL_SLOT_ICON, MEAL_TINT } from "@/lib/diary/food";
import { fmt, MEAL_LABEL, sumNutrition } from "@/lib/diary/stats";
import type { DiaryEntry, MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EntryRow } from "./EntryRow";

/** Breakfast / Lunch / Dinner / Snack with its total and entries, or an empty "add" row */
export function MealSection({
  meal,
  entries,
  canAdd,
  onAdd,
  onOpenEntry,
  className,
  style,
}: {
  meal: MealType;
  entries: DiaryEntry[];
  /** Offer the "+" / "Add food" buttons (today only: Sous logs to today) */
  canAdd: boolean;
  /** Opens the "Add to <meal>" sheet */
  onAdd?: (meal: MealType) => void;
  onOpenEntry: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const addable = canAdd && !!onAdd;
  const Icon = MEAL_SLOT_ICON[meal];
  const total = sumNutrition(entries);

  return (
    <section aria-label={MEAL_LABEL[meal]} className={cn("animate-fade-up", className)} style={style}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold text-ink">
          <span className={cn("flex size-8 items-center justify-center rounded-full", MEAL_TINT[meal])}>
            <Icon className="size-4" strokeWidth={2.2} />
          </span>
          {MEAL_LABEL[meal]}
        </h2>
        <div className="flex items-center gap-3">
          {entries.length > 0 && (
            <span className="text-sm font-semibold tabular-nums text-ink-soft">
              {fmt(total.calories)} <span className="text-xs font-medium text-ink-faint">kcal</span>
            </span>
          )}
          {addable && entries.length > 0 && (
            <button
              type="button"
              onClick={() => onAdd?.(meal)}
              aria-label={`Add to ${MEAL_LABEL[meal]}`}
              title={`Add to ${MEAL_LABEL[meal]}`}
              className="relative inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent transition after:absolute after:-inset-2 after:content-[''] hover:bg-[color-mix(in_oklab,var(--color-accent-soft),var(--color-accent)_12%)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Plus className="size-4" strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {entries.length > 0 ? (
        <Card className="flex flex-col gap-1 p-2">
          {entries.map((e, i) => (
            <div key={e.id} className={cn("animate-fade-up", i > 0 && "border-t border-line pt-1")} style={{ animationDelay: `${i * 50}ms` }}>
              <EntryRow entry={e} onOpen={onOpenEntry} />
            </div>
          ))}
        </Card>
      ) : (
        <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-card border-2 border-dashed border-line px-4 py-2">
          <span className="text-sm font-medium text-ink-faint">Nothing logged</span>
          {addable && (
            <button
              type="button"
              onClick={() => onAdd?.(meal)}
              className="inline-flex h-11 items-center gap-1.5 rounded-pill bg-accent-soft px-4 text-sm font-semibold text-accent-strong transition active:scale-95 hover:bg-[color-mix(in_oklab,var(--color-accent-soft),var(--color-accent)_12%)]"
            >
              <Plus className="size-4" />
              Add food
            </button>
          )}
        </div>
      )}
    </section>
  );
}
