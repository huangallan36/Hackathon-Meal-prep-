"use client";

import { Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { nutrientRows, type TotalsResult } from "@/lib/diary/stats";
import type { NutritionGoals } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MacroBars } from "./MacroBars";
import { NutrientList, NutrientRingRow } from "./NutrientRow";

/** One honest line about where the numbers came from, or null when they're all logged values */
export function estimateNote(result: Pick<TotalsResult, "microsEstimated" | "aiEstimated">): string | null {
  if (result.microsEstimated) return "Includes estimates: some vitamins and minerals are filled in from calories for meals logged without them.";
  if (result.aiEstimated) return "Includes Sous's estimates for meals logged by photo, voice or text.";
  return null;
}

function GroupTitle({ children }: { children: string }) {
  return <h3 className="mb-2 mt-5 px-1 text-xs font-semibold uppercase leading-[normal] tracking-[0.08em] text-ink-soft">{children}</h3>;
}

/**
 * Daily diary "Nutrients": macro bars (protein, carbs, fat, fiber) like Figma 3.1's energy
 * targets, then every vitamin, mineral and limit as Figma 3.2's ring rows.
 * `id="nutrients"` is the target of /diary/<date>#nutrients links.
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

      <Card className="mt-3">
        <MacroBars rows={macros} />
      </Card>

      <GroupTitle>Vitamins &amp; minerals</GroupTitle>
      <NutrientList label="Vitamins and minerals">
        {vitamins.map((r, i) => (
          <NutrientRingRow key={r.def.key} row={r} index={i} />
        ))}
      </NutrientList>

      <GroupTitle>Limits</GroupTitle>
      <NutrientList label="Limits">
        {limits.map((r, i) => (
          <NutrientRingRow key={r.def.key} row={r} index={i + vitamins.length} />
        ))}
      </NutrientList>

      {note && (
        <p className="mt-3 flex items-start gap-1.5 px-1 text-xs leading-relaxed text-ink-faint">
          <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden />
          {note}
        </p>
      )}
    </section>
  );
}
