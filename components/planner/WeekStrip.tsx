"use client";

import { Plus } from "lucide-react";
import { SmartImage } from "@/components/ui/Misc";
import { Spinner } from "@/components/ui/Spinner";
import type { PlanDay } from "@/lib/planner/hooks";
import type { ISODate } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";
import { Scroller } from "./PlannerSection";
import { stagger } from "./RecipeMeta";

/**
 * The next seven days as tiles, in the planner's flat card language (white, 1px line,
 * radius 18). A planned day shows its dishes as small round plates; an empty day is a
 * dashed slot that starts "pick something for this day".
 */
export function WeekStrip({
  days,
  target,
  busyId,
  onDay,
}: {
  days: PlanDay[];
  /** Day currently being planned (highlighted) */
  target: ISODate | null;
  /** Recipe id being fetched after a tap (planned live recipes not held locally) */
  busyId?: number | null;
  onDay: (day: PlanDay) => void;
}) {
  return (
    <Scroller label="This week" gap="gap-2.5">
      {days.map((day, i) => (
        <DayTile
          key={day.date}
          day={day}
          index={i}
          today={i === 0}
          selected={target === day.date}
          busy={busyId != null && day.meals[0]?.recipeId === busyId}
          onClick={() => onDay(day)}
        />
      ))}
    </Scroller>
  );
}

function DayTile({
  day,
  index,
  today,
  selected,
  busy,
  onClick,
}: {
  day: PlanDay;
  index: number;
  today: boolean;
  selected: boolean;
  busy?: boolean;
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
      aria-busy={busy || undefined}
      disabled={busy}
      style={stagger(index, 40)}
      className={cn(
        "flex h-[112px] w-[76px] shrink-0 snap-start flex-col justify-between rounded-tile border p-2.5 text-left animate-fade-up transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? "border-accent bg-accent-soft"
          : planned
            ? "border-line bg-surface"
            : "border-dashed border-line-strong/60 bg-surface/50",
      )}
    >
      <span className="leading-[normal]">
        <span className={cn("block truncate text-caption font-semibold", today ? "text-accent" : "text-ink-soft")}>
          {day.label}
        </span>
        <span className="block font-display text-heading font-semibold leading-none text-ink">{day.dayOfMonth}</span>
      </span>

      {busy ? (
        <span className="flex size-9 items-center justify-center">
          <Spinner className="size-5 text-accent" />
        </span>
      ) : planned ? (
        <span className="flex items-center">
          {day.meals.slice(0, 2).map((m, i) => (
            <SmartImage
              key={m.id}
              src={m.image}
              alt=""
              className={cn("size-9 rounded-full ring-2 ring-surface", i > 0 && "-ml-3")}
            />
          ))}
          {day.meals.length > 2 && <span className="ml-1 text-xs font-semibold text-ink-soft">+{day.meals.length - 2}</span>}
        </span>
      ) : (
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            selected ? "bg-accent text-white" : "bg-cream-deep text-ink-soft",
          )}
        >
          <Plus className="size-4" />
        </span>
      )}
    </button>
  );
}
