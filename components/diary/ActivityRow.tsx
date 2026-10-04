"use client";

import { Dumbbell, Footprints, Moon, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt } from "@/lib/diary/stats";
import type { DailyActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";

/** Steps, exercise and sleep for one day ("–" when nothing was tracked) */
export function ActivityRow({
  activity,
  className,
  style,
}: {
  activity?: DailyActivity;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Card className={cn("p-5", className)} style={style}>
      <SectionLabel>Activity</SectionLabel>
      <div className="mt-4 grid grid-cols-3 divide-x divide-line">
        <Stat
          Icon={Footprints}
          tint="bg-herb-soft text-herb"
          value={activity?.steps}
          unit=""
          caption="steps"
        />
        <Stat
          Icon={Dumbbell}
          tint="bg-accent-soft text-accent"
          value={activity?.exerciseMinutes}
          unit="min"
          caption={activity ? (activity.exerciseKcal > 0 ? `${fmt(activity.exerciseKcal)} kcal` : "rest day") : "exercise"}
        />
        <Stat
          Icon={Moon}
          tint="bg-[color-mix(in_oklab,var(--color-fat)_14%,white)] text-fat"
          value={activity?.sleepHours}
          decimals={1}
          unit="h"
          caption="sleep"
        />
      </div>
    </Card>
  );
}

function Stat({
  Icon,
  tint,
  value,
  unit,
  caption,
  decimals = 0,
}: {
  Icon: LucideIcon;
  tint: string;
  value?: number;
  unit: string;
  caption: string;
  decimals?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1 text-center">
      <span className={cn("flex size-10 items-center justify-center rounded-full", tint)}>
        <Icon className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-semibold leading-tight text-ink">
        {value == null ? "–" : <CountUp value={value} decimals={decimals} />}
        {value != null && unit && <span className="ml-0.5 text-xs font-medium text-ink-soft">{unit}</span>}
      </span>
      <span className="text-[11px] font-medium text-ink-faint">{caption}</span>
    </div>
  );
}
