"use client";

import { Flame, Target, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, ratio } from "@/lib/diary/stats";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressRing } from "./ProgressRing";

/** Calories for one day: ring (consumed / goal) with what's left in the middle, plus mini stats */
export function CalorieRing({
  consumed,
  goal,
  burned,
  className,
  style,
}: {
  consumed: number;
  goal: number;
  /** Exercise kcal from activity, shown for context */
  burned?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const remaining = Math.round(goal - consumed);
  const over = remaining < 0;
  const r = ratio(consumed, goal);
  // Never "100%" next to "10 kcal over" (or "5 kcal left"): round toward the side we're on
  const pct = over ? Math.ceil(r * 100) : Math.floor(r * 100);

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between">
        <SectionLabel>Calories</SectionLabel>
        <span
          className={cn(
            "rounded-pill px-2.5 py-1 text-[11px] font-semibold tabular-nums",
            over ? "bg-accent-soft text-accent-strong" : "bg-herb-soft text-herb",
          )}
        >
          {pct}% of goal
        </span>
      </div>

      <div className="mt-3 flex items-center gap-5">
        <ProgressRing
          value={r}
          size={148}
          stroke={14}
          colorClass="stroke-accent"
          trackClass="stroke-accent-soft"
          overClass="stroke-accent-strong"
          label={over ? `${fmt(-remaining)} kcal over goal` : `${fmt(remaining)} kcal left of ${fmt(goal)}`}
        >
          <CountUp value={Math.abs(remaining)} className="font-display text-[32px] font-semibold leading-none text-ink" />
          <span className={cn("mt-1 text-xs font-semibold", over ? "text-accent-strong" : "text-ink-soft")}>
            {over ? "kcal over" : "kcal left"}
          </span>
        </ProgressRing>

        <ul className="flex min-w-0 flex-1 flex-col gap-3.5">
          <MiniStat Icon={UtensilsCrossed} label="Consumed" value={consumed} tint="bg-accent-soft text-accent" />
          <MiniStat Icon={Flame} label="Burned" value={burned ?? 0} tint="bg-butter-soft text-[color-mix(in_oklab,var(--color-carbs),black_25%)]" />
          <MiniStat Icon={Target} label="Goal" value={goal} tint="bg-cream-deep text-ink-soft" />
        </ul>
      </div>
    </Card>
  );
}

function MiniStat({ Icon, label, value, tint }: { Icon: LucideIcon; label: string; value: number; tint: string }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tint)}>
        <Icon className="size-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</span>
        <span className="block text-[15px] font-semibold leading-tight text-ink">
          <CountUp value={value} /> <span className="text-xs font-medium text-ink-soft">kcal</span>
        </span>
      </span>
    </li>
  );
}
