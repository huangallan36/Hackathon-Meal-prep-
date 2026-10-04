"use client";

import { Plus } from "lucide-react";
import { SmartImage } from "@/components/ui/Misc";
import type { PlanDay } from "@/lib/planner/hooks";
import type { ISODate } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";
import { Scroller } from "./PlannerSection";
import { stagger } from "./RecipeMeta";

/**
 * The next seven days as tiles. A planned day shows its dish photos; an empty day is a
 * dashed slot that starts "pick something for this day".
 */
export function WeekStrip({
  days,
  target,
  onDay,
}: {
  days: PlanDay[];
  /** Day currently being planned (highlighted) */
  target: ISODate | null;
  onDay: (day: PlanDay) => void;
}) {
  return (
    <Scroller label="This week">
      {days.map((day, i) => (
        <DayTile key={day.date} day={day} index={i} today={i === 0} selected={target === day.date} onClick={() => onDay(day)} />
      ))}
    </Scroller>
  );
}

function DayTile({
  day,
  index,
  today,
  selected,
  onClick,
}: {
  day: PlanDay;
  index: number;
  today: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const planned = day.meals.length > 0;
  const longDay = formatDay(day.date, { weekday: "long", month: "short", day: "numeric" });
  const label = planned
    ? `${longDay}: ${day.meals.map((m) => m.title).join(", ")}`
    : `${longDay}: nothing planned. Tap to pick a recipe.`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      style={stagger(index, 40)}
      className={cn(
        "flex h-[128px] w-[84px] shrink-0 snap-start flex-col justify-between rounded-tile p-2.5 text-left animate-fade-up transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        planned ? "bg-surface shadow-card" : "border border-dashed border-line bg-surface/50",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-cream",
      )}
    >
      <span>
        <span
          className={cn(
            "block truncate text-[11px] font-semibold uppercase tracking-[0.1em]",
            today ? "text-accent-strong" : "text-ink-faint",
          )}
        >
          {day.label}
        </span>
        <span className="block font-display text-[26px] font-semibold leading-none text-ink">{day.dayOfMonth}</span>
      </span>

      {planned ? (
        <span className="flex items-center">
          {day.meals.slice(0, 2).map((m, i) => (
            <SmartImage
              key={m.id}
              src={m.image}
              alt=""
              className={cn("size-10 rounded-full ring-2 ring-surface", i > 0 && "-ml-3")}
            />
          ))}
          {day.meals.length > 2 && <span className="ml-1 text-xs font-semibold text-ink-soft">+{day.meals.length - 2}</span>}
        </span>
      ) : (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-full border border-dashed",
            selected ? "border-accent bg-accent-soft text-accent-strong" : "border-ink-faint/50 text-ink-faint",
          )}
        >
          <Plus className="size-4" />
        </span>
      )}
    </button>
  );
}
