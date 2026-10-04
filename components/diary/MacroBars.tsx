"use client";

import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { fmt, ratio } from "@/lib/diary/stats";
import type { Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressBar } from "./ProgressBar";

type MacroKey = "protein" | "carbs" | "fat";

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
  const kcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const perGram: Record<MacroKey, number> = { protein: 4, carbs: 4, fat: 9 };

  return (
    <Card className={cn("p-5", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Macros</SectionLabel>
        {kcal > 0 && (
          <span className="flex items-center gap-2.5 text-[11px] font-semibold tabular-nums text-ink-soft" aria-label="Share of calories">
            {MACROS.map((m) => (
              <span key={m.key} className="flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", m.dot)} />
                {Math.round(((totals[m.key] * perGram[m.key]) / kcal) * 100)}%
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
