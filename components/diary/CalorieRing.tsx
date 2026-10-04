"use client";

import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { fmt, ratio } from "@/lib/diary/stats";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressRing } from "./ProgressRing";

/**
 * Figma 3.1 weekly calorie card: a 132px ring with the average kcal a day inside, and
 * Consumed / Goal / Remaining beside it (Remaining turns into "Over" past the goal).
 */
export function CalorieRing({
  consumed,
  goal,
  caption = "kcal / day",
  className,
  style,
}: {
  consumed: number;
  goal: number;
  caption?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const eaten = Number.isFinite(consumed) ? Math.max(0, Math.round(consumed)) : 0;
  const target = Number.isFinite(goal) && goal > 0 ? Math.round(goal) : 0;
  const left = target - eaten;
  const stats = [
    { label: "Consumed", value: eaten, tone: "text-accent" },
    { label: "Goal", value: target, tone: "text-ink" },
    left >= 0 ? { label: "Remaining", value: left, tone: "text-flame" } : { label: "Over", value: -left, tone: "text-flame" },
  ];

  return (
    <Card className={cn("flex items-center gap-[18px]", className)} style={style}>
      <ProgressRing
        value={ratio(eaten, target)}
        size={132}
        stroke={13}
        cap="butt"
        colorClass="stroke-accent"
        trackSrc="/figma/screens/2-155/ellipse.svg"
        label={`${fmt(eaten)} of ${fmt(target)} kcal a day`}
      >
        <CountUp value={eaten} className="font-display text-title font-semibold leading-[normal] text-ink" />
        <span className="text-xs leading-[normal] text-ink-soft">{caption}</span>
      </ProgressRing>
      <dl className="flex min-w-0 flex-1 flex-col gap-3 leading-[normal]">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-xs text-ink-soft">{s.label}</dt>
            <dd className={cn("truncate text-lead font-semibold tabular-nums", s.tone)}>{fmt(s.value)} kcal</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
