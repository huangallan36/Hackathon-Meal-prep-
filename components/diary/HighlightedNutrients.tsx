"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Card, SectionLabel } from "@/components/ui/Card";
import { highlightedNutrients, type TotalsResult } from "@/lib/diary/stats";
import type { ISODate, NutritionGoals } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NutrientRingRow } from "./NutrientRow";

/**
 * Diary home: the day's most notable nutrients (furthest below target, plus any limit
 * that's over) in Figma's ring-row style, with "See all" into the day's full breakdown.
 */
export function HighlightedNutrients({
  result,
  goals,
  date,
  className,
  style,
}: {
  result: TotalsResult;
  goals: NutritionGoals;
  date: ISODate;
  className?: string;
  style?: CSSProperties;
}) {
  const rows = result.count > 0 ? highlightedNutrients(result.totals, goals) : [];
  const estimated = result.microsEstimated || result.aiEstimated;

  return (
    <Card className={cn("p-5 pb-2", className)} style={style}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <SectionLabel>Highlighted nutrients</SectionLabel>
          {estimated && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-faint" title="Some values are estimates">
              <Sparkles className="size-3" aria-hidden />
              est.
            </span>
          )}
        </div>
        <Link
          href={`/diary/${date}#nutrients`}
          className="-my-3 -mr-2 inline-flex h-11 shrink-0 items-center gap-0.5 rounded-pill px-2 text-sm font-semibold text-accent transition active:scale-95"
        >
          See all
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {rows.length > 0 ? (
        <ul className="-mx-3 mt-1 divide-y divide-line">
          {rows.map((r, i) => (
            <NutrientRingRow key={r.def.key} row={r} index={i} />
          ))}
        </ul>
      ) : (
        <p className="mb-3 mt-3 rounded-tile bg-cream px-4 py-4 text-center text-sm text-ink-faint">Log a meal to see your vitamins and minerals</p>
      )}
    </Card>
  );
}
