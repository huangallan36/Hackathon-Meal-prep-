"use client";

import { Camera, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, groupByMeal, isFresh, MEAL_LABEL, MEAL_ORDER } from "@/lib/diary/stats";
import type { DiaryEntry, ISODate } from "@/lib/types";
import { cn, mealForNow } from "@/lib/utils";
import { FoodThumb, JustLoggedTag, SousTag } from "./EntryBits";

const MAX_ROWS = 5;

/**
 * Compact list of a day's meals on the Diary home, so a meal logged through Sous is
 * visible right away. Today also gets a nudge for the meal slot that fits the time.
 */
export function MealsPreview({
  date,
  today,
  entries,
  className,
  style,
}: {
  date: ISODate;
  today: ISODate;
  /** All diary entries (filtered here) */
  entries: DiaryEntry[];
  className?: string;
  style?: CSSProperties;
}) {
  const grouped = groupByMeal(entries, date);
  const rows = MEAL_ORDER.flatMap((m) => grouped[m]);
  const shown = rows.slice(0, MAX_ROWS);
  const hidden = rows.length - shown.length;
  const href = `/diary/${date}`;
  const nowSlot = mealForNow();
  const nudge = date === today && nowSlot !== "snack" && grouped[nowSlot].length === 0 ? nowSlot : null;

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Meals</SectionLabel>
        <Link
          href={href}
          className="-my-3 -mr-2 inline-flex h-11 items-center gap-0.5 rounded-pill px-2 text-sm font-semibold text-accent transition active:scale-95"
        >
          Open diary
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {rows.length === 0 && !nudge && (
        <p className="mt-3 rounded-tile bg-cream px-4 py-4 text-center text-sm text-ink-faint">Nothing logged this day</p>
      )}

      {shown.length > 0 && (
        <ul className="mt-2 flex flex-col">
          {shown.map((e, i) => (
            <li key={e.id} className={cn("animate-fade-up", i > 0 && "border-t border-line")} style={{ animationDelay: `${i * 40}ms` }}>
              <Link href={href} className="flex items-center gap-3 py-2.5 transition active:opacity-70">
                <FoodThumb entry={e} className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{e.name}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                    <span className="truncate">{MEAL_LABEL[e.meal]}</span>
                    {isFresh(e) ? <JustLoggedTag /> : e.source === "ai" ? <SousTag /> : null}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
                  {fmt(e.nutrition.calories)}
                  <span className="ml-0.5 text-[11px] font-medium text-ink-faint">kcal</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <Link href={href} className="mt-1 block text-center text-xs font-semibold text-ink-soft">
          +{hidden} more
        </Link>
      )}

      {nudge && (
        <Link
          href="/ai/snap"
          className="mt-3 flex items-center gap-3 rounded-tile border-2 border-dashed border-line px-3 py-3 transition active:scale-[0.99] hover:border-accent/40"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-tile bg-accent-soft text-accent">
            <Camera className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{MEAL_LABEL[nudge]} not logged yet</span>
            <span className="block truncate text-xs text-ink-soft">Snap it and Sous will do the math</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-faint" />
        </Link>
      )}
    </Card>
  );
}
