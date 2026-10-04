"use client";

import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, ratio, type DayTotals } from "@/lib/diary/stats";
import type { NutritionGoals } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressRing } from "./ProgressRing";

type NutrientKey = "fiber" | "iron" | "calcium" | "vitaminA";

const NUTRIENTS: { key: NutrientKey; label: string; unit: string; decimals: number; stroke: string; text: string }[] = [
  { key: "fiber", label: "Fiber", unit: "g", decimals: 0, stroke: "stroke-fiber", text: "text-fiber" },
  { key: "iron", label: "Iron", unit: "mg", decimals: 1, stroke: "stroke-accent-strong", text: "text-accent-strong" },
  { key: "calcium", label: "Calcium", unit: "mg", decimals: 0, stroke: "stroke-fat", text: "text-fat" },
  {
    key: "vitaminA",
    label: "Vitamin A",
    unit: "mcg",
    decimals: 0,
    stroke: "stroke-carbs",
    text: "text-[color-mix(in_oklab,var(--color-carbs),black_25%)]",
  },
];

/** 2x2 highlighted nutrients with % of daily goal */
export function NutrientGrid({
  totals,
  goals,
  estimated,
  className,
  style,
}: {
  totals: DayTotals;
  goals: NutritionGoals;
  /** Some micronutrients were estimated (photo-logged meals) */
  estimated?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Highlighted nutrients</SectionLabel>
        {estimated && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-faint">
            <Sparkles className="size-3" />
            incl. estimates
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {NUTRIENTS.map((n, i) => {
          const value = totals[n.key];
          const goal = goals[n.key];
          const r = ratio(value, goal);
          return (
            <div key={n.key} className="rounded-tile bg-cream p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{n.label}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    of {fmt(goal)} {n.unit}
                  </p>
                </div>
                <ProgressRing
                  value={r}
                  size={40}
                  stroke={4.5}
                  colorClass={n.stroke}
                  trackClass="stroke-cream-deep"
                  delay={0.2 + i * 0.08}
                  label={`${Math.round(r * 100)}% of daily ${n.label.toLowerCase()}`}
                >
                  <span className={cn("text-[10px] font-bold tabular-nums", n.text)}>{Math.round(r * 100)}%</span>
                </ProgressRing>
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <CountUp value={value} decimals={n.decimals} className="font-display text-2xl font-semibold leading-none text-ink" />
                <span className="text-xs font-medium text-ink-soft">{n.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
