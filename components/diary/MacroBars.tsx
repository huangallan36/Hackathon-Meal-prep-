"use client";

import type { NutrientRow } from "@/lib/diary/stats";
import { formatAmount, type NutrientKey } from "@/lib/nutrients";
import { cn } from "@/lib/utils";
import { amountOnly } from "./NutrientRow";
import { ProgressBar } from "./ProgressBar";

/** Figma 3.1 bar colors: protein green, carbs amber, fat orange (fiber blue for the diary) */
export const MACRO_BAR: Partial<Record<NutrientKey, string>> = {
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
  fiber: "bg-fiber",
};

/**
 * Figma 3.1 "Energy targets" rows: "Protein ... 128 / 150 g" over a 6px bar on a line-colored
 * track. Rows are 12px apart.
 */
export function MacroBars({ rows, className }: { rows: NutrientRow[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {rows.map((r, i) => (
        <li key={r.def.key} className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3 leading-[normal]">
            <span className="truncate text-sm font-medium text-ink">{r.def.label}</span>
            <span className="shrink-0 text-meta tabular-nums text-ink-soft">
              {amountOnly(r.value, r.def.unit)} / {formatAmount(r.target, r.def.unit)}
            </span>
          </div>
          <ProgressBar
            value={r.ratio}
            colorClass={MACRO_BAR[r.def.key] ?? "bg-accent"}
            trackClass="bg-line"
            height="h-1.5"
            delay={0.1 + i * 0.08}
            label={`${r.def.label}: ${amountOnly(r.value, r.def.unit)} of ${formatAmount(r.target, r.def.unit)}`}
          />
        </li>
      ))}
    </ul>
  );
}
