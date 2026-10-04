"use client";

import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { nutrientRows, type TotalsResult } from "@/lib/diary/stats";
import { formatAmount, type NutrientKey } from "@/lib/nutrients";
import type { NutritionGoals } from "@/lib/types";
import { cn } from "@/lib/utils";
import { amountOnly, NutrientRingRow } from "./NutrientRow";
import { ProgressBar } from "./ProgressBar";

const MACRO_COLOR: Partial<Record<NutrientKey, { bar: string; dot: string }>> = {
  protein: { bar: "bg-protein", dot: "bg-protein" },
  carbs: { bar: "bg-carbs", dot: "bg-carbs" },
  fat: { bar: "bg-fat", dot: "bg-fat" },
  fiber: { bar: "bg-fiber", dot: "bg-fiber" },
};

/** One honest line about where the numbers came from, or null when they're all logged values */
export function estimateNote(result: Pick<TotalsResult, "microsEstimated" | "aiEstimated">): string | null {
  if (result.microsEstimated) return "Includes estimates: some vitamins and minerals are filled in from calories for meals logged without them.";
  if (result.aiEstimated) return "Includes Sous's estimates for meals logged by photo, voice or text.";
  return null;
}

function GroupTitle({ children }: { children: string }) {
  return <h3 className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">{children}</h3>;
}

/**
 * Daily diary "Nutrients": macro bars (protein, carbs, fat, fiber), then every vitamin,
 * mineral and limit as Figma's ring rows. `id="nutrients"` is the target of "See all".
 */
export function NutrientsSection({
  result,
  goals,
  className,
  style,
}: {
  result: TotalsResult;
  goals: NutritionGoals;
  className?: string;
  style?: CSSProperties;
}) {
  const { totals } = result;
  const macros = nutrientRows(totals, goals, ["macro"]);
  const vitamins = nutrientRows(totals, goals, ["mineral", "vitamin"]);
  const limits = nutrientRows(totals, goals, ["limit"]);
  const note = estimateNote(result);

  return (
    <section id="nutrients" aria-label="Nutrients" className={cn("animate-fade-up scroll-mt-24", className)} style={style}>
      <SectionHeader
        title="Nutrients"
        className="px-1"
        action={<span className="text-xs font-medium text-ink-faint">vs. daily targets</span>}
      />

      <Card className="mt-3 p-5">
        <ul className="flex flex-col gap-4">
          {macros.map((r, i) => (
            <li key={r.def.key}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className={cn("size-2.5 shrink-0 rounded-full", MACRO_COLOR[r.def.key]?.dot)} aria-hidden />
                  {r.def.label}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-ink-soft">
                  {amountOnly(r.value, r.def.unit)} / {formatAmount(r.target, r.def.unit)}
                </span>
              </div>
              <ProgressBar
                value={r.ratio}
                colorClass={MACRO_COLOR[r.def.key]?.bar ?? "bg-accent"}
                trackClass="bg-line"
                height="h-1.5"
                delay={0.1 + i * 0.08}
              />
            </li>
          ))}
        </ul>
      </Card>

      <GroupTitle>Vitamins &amp; minerals</GroupTitle>
      <Card className="p-1">
        <ul className="divide-y divide-line">
          {vitamins.map((r, i) => (
            <NutrientRingRow key={r.def.key} row={r} index={i} />
          ))}
        </ul>
      </Card>

      <GroupTitle>Limits</GroupTitle>
      <Card className="p-1">
        <ul className="divide-y divide-line">
          {limits.map((r, i) => (
            <NutrientRingRow key={r.def.key} row={r} index={i + vitamins.length} />
          ))}
        </ul>
      </Card>

      {note && (
        <p className="mt-3 flex items-start gap-1.5 px-1 text-xs leading-relaxed text-ink-faint">
          <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden />
          {note}
        </p>
      )}
    </section>
  );
}
