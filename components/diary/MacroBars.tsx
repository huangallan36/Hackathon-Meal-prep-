"use client";

import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, ratio, splitPercents } from "@/lib/diary/stats";
import type { Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressBar } from "./ProgressBar";

type MacroKey = "protein" | "carbs" | "fat";

const KCAL_PER_GRAM: Record<MacroKey, number> = { protein: 4, carbs: 4, fat: 9 };

export const MACROS: { key: MacroKey; label: string; short: string; bar: string; dot: string }[] = [
  { key: "protein", label: "Protein", short: "P", bar: "bg-protein", dot: "bg-protein" },
  { key: "carbs", label: "Carbs", short: "C", bar: "bg-carbs", dot: "bg-carbs" },
  { key: "fat", label: "Fat", short: "F", bar: "bg-fat", dot: "bg-fat" },
];

/** Protein / carbs / fat: grams vs goal with animated bars */
export function MacroBars({
  totals,
  goals,
  className,
  style,
}: {
  totals: Pick<Nutrition, MacroKey>;
  goals: Pick<Nutrition, MacroKey>;
  className?: string;
  style?: CSSProperties;
}) {
  // Share of calories from each macro (4/4/9 kcal per gram), for the split legend
  const split = splitPercents(MACROS.map((m) => totals[m.key] * KCAL_PER_GRAM[m.key]));
  const hasSplit = split.some((p) => p > 0);

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Macros</SectionLabel>
        {hasSplit && (
          <span
            className="flex items-center gap-2.5 text-[11px] font-semibold tabular-nums text-ink-soft"
            aria-label={`Share of calories: ${MACROS.map((m, i) => `${m.label} ${split[i]}%`).join(", ")}`}
          >
            {MACROS.map((m, i) => (
              <span key={m.key} className="flex items-center gap-1" aria-hidden>
                <span className={cn("size-1.5 rounded-full", m.dot)} />
                {split[i]}%
              </span>
            ))}
          </span>
        )}
      </div>
      <ul className="mt-4 flex flex-col gap-4">
        {MACROS.map((m, i) => {
          const value = totals[m.key];
          const goal = goals[m.key];
          const left = Math.round(goal - value);
          return (
            <li key={m.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span className={cn("size-2.5 rounded-full", m.dot)} />
                  {m.label}
                </span>
                <span className="text-sm tabular-nums text-ink-soft">
                  <CountUp value={value} className="font-semibold text-ink" />
                  <span className="text-ink-faint"> / {fmt(goal)} g</span>
                </span>
              </div>
              <ProgressBar value={ratio(value, goal)} colorClass={m.bar} delay={0.15 + i * 0.08} />
              <p className="mt-1 text-right text-[11px] font-medium tabular-nums text-ink-faint">
                {left >= 0 ? `${fmt(left)} g left` : `${fmt(-left)} g over`}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
