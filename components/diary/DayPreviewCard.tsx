"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DAY_STATUS_LABEL, fmt, type DayInfo } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { cn, formatDay } from "@/lib/utils";
import { MascotNote } from "./MascotNote";

/** The sous-chef's streak cheer: "12 days in a row. Keep it going." */
function streakLine(streak: number): string {
  return streak === 1 ? "Day one of a streak. Keep it going." : `${fmt(streak)} days in a row. Keep it going.`;
}

/**
 * Figma 3.4 selected-day card: "Wed, Sep 30", "2,140 kcal · on target", "Open diary",
 * P / C / F chips and, for a logged day, the sous-chef celebrating the streak it belongs to.
 */
export function DayPreviewCard({
  info,
  today,
  streak,
  className,
  style,
}: {
  info: DayInfo;
  today: ISODate;
  /** Consecutive logged days ending on this day */
  streak: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { date } = info;
  const logged = info.status !== "none";
  const isToday = date === today;
  const subtitle = logged
    ? `${fmt(info.kcal)} kcal · ${isToday && info.status === "partial" ? "so far" : DAY_STATUS_LABEL[info.status]}`
    : isToday
      ? "Nothing logged yet"
      : "Nothing logged";

  return (
    <Card className={cn("flex flex-col gap-2.5", className)} style={style} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-px leading-[normal]">
          <h2 className="truncate font-display text-base font-semibold text-ink">
            {isToday ? `Today, ${formatDay(date)}` : formatDay(date, { weekday: "short", month: "short", day: "numeric" })}
          </h2>
          <p className="truncate text-xs text-ink-soft">{subtitle}</p>
        </div>
        <Link
          href={isToday ? "/diary" : `/diary/${date}`}
          className="relative shrink-0 rounded-pill bg-accent px-3 py-[7px] text-xs font-semibold leading-[normal] text-white transition after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Open diary
        </Link>
      </div>

      {logged && (
        <div className="flex flex-wrap items-start gap-2">
          <Chip tone="accent" size="sm" className="text-xs font-semibold">
            P {fmt(info.protein)}g
          </Chip>
          <Chip tone="butter" size="sm" className="text-xs font-semibold">
            C {fmt(info.carbs)}g
          </Chip>
          <Chip tone="flame" size="sm" className="text-xs font-semibold">
            F {fmt(info.fat)}g
          </Chip>
        </div>
      )}

      {streak > 0 && (
        <MascotNote size={30} square textClassName="text-accent" className="pt-1">
          {streakLine(streak)}
        </MascotNote>
      )}
    </Card>
  );
}
