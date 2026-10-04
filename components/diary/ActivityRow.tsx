"use client";

import type { CSSProperties } from "react";
import { fmt, formatHours } from "@/lib/diary/stats";
import type { DailyActivity, ISODate } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Average exercise minutes and sleep over `days` (days without tracking are skipped) */
export function activityAverages(activity: Record<ISODate, DailyActivity>, days: ISODate[]): { exercise: number; sleep: number } | null {
  const tracked = days.map((d) => activity[d]).filter((a): a is DailyActivity => !!a);
  if (!tracked.length) return null;
  const avg = (pick: (a: DailyActivity) => number) =>
    tracked.reduce((sum, a) => sum + (Number.isFinite(pick(a)) ? Math.max(0, pick(a)) : 0), 0) / tracked.length;
  return { exercise: avg((a) => a.exerciseMinutes), sleep: avg((a) => a.sleepHours) };
}

/** Figma 3.1 "Activity & sleep" tile: average exercise minutes and sleep for the week */
export function ActivityRow({
  activity,
  days,
  className,
  style,
}: {
  activity: Record<ISODate, DailyActivity>;
  days: ISODate[];
  className?: string;
  style?: CSSProperties;
}) {
  const avg = activityAverages(activity, days);
  return (
    <section
      aria-label="Activity and sleep, daily average"
      className={cn("flex min-w-0 flex-1 flex-col gap-2.5 rounded-card bg-surface px-4 py-3.5 shadow-card", className)}
      style={style}
    >
      <h2 className="truncate text-sm font-semibold leading-[normal] text-ink">Activity &amp; sleep</h2>
      <Stat
        icon="/figma/screens/2-155/icon-activity.svg"
        tint="bg-flame/12"
        value={avg ? `${fmt(avg.exercise)} min` : "–"}
        unit="exercise"
      />
      <Stat icon="/figma/screens/2-155/icon-moon.svg" tint="bg-sky/12" value={avg ? formatHours(avg.sleep) : "–"} unit="sleep" />
    </section>
  );
}

function Stat({ icon, tint, value, unit }: { icon: string; tint: string; value: string; unit: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={cn("flex size-[26px] shrink-0 items-center justify-center rounded-full", tint)}>
        <img src={icon} alt="" width={14} height={14} className="block size-3.5" />
      </span>
      <p className="flex min-w-0 items-end gap-1 leading-[normal]">
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{value}</span>
        <span className="truncate text-caption text-ink-soft">{unit}</span>
      </p>
    </div>
  );
}
