"use client";

import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, ratio } from "@/lib/diary/stats";
import type { Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { MACROS } from "./MacroBars";
import { ProgressBar } from "./ProgressBar";

/** Daily diary header card: kcal eaten vs goal plus macro mini bars */
export function DaySummary({
  totals,
  goals,
  className,
  style,
}: {
  totals: Nutrition;
  goals: Nutrition;
  className?: string;
  style?: CSSProperties;
}) {
  const left = Math.round(goals.calories - totals.calories);
  const over = left < 0;

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>Eaten</SectionLabel>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <CountUp value={totals.calories} className="font-display text-[34px] font-semibold leading-none text-ink" />
            <span className="text-sm font-medium tabular-nums text-ink-soft">/ {fmt(goals.calories)} kcal</span>
          </p>
        </div>
        <span
          className={cn(
            "mb-0.5 shrink-0 rounded-pill px-3 py-1.5 text-xs font-semibold tabular-nums",
            over ? "bg-accent-soft text-accent-strong" : "bg-herb-soft text-herb",
          )}
        >
          {over ? `${fmt(-left)} over` : `${fmt(left)} left`}
        </span>
      </div>

      <ProgressBar
        value={ratio(totals.calories, goals.calories)}
        colorClass={over ? "bg-accent-strong" : "bg-accent"}
        trackClass="bg-accent-soft"
        height="h-3"
        className="mt-4"
      />

      <div className="mt-5 grid grid-cols-3 gap-4">
        {MACROS.map((m, i) => (
          <div key={m.key} className="min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <span className="truncate text-xs font-semibold text-ink">{m.label}</span>
              <span className="text-[11px] tabular-nums text-ink-soft">{fmt(totals[m.key])}g</span>
            </div>
            <ProgressBar value={ratio(totals[m.key], goals[m.key])} colorClass={m.bar} height="h-1.5" className="mt-1.5" delay={0.2 + i * 0.08} />
            <p className="mt-1 text-[10px] tabular-nums text-ink-faint">of {fmt(goals[m.key])}g</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
