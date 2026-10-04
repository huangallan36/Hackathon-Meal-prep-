"use client";

import type { CSSProperties } from "react";
import type { NutrientRow } from "@/lib/diary/stats";
import { cn } from "@/lib/utils";
import { NutrientList, NutrientRingRow } from "./NutrientRow";

/** Figma 3.2 "Highlighted nutrients" card: one ring row per nutrient, in the given order */
export function HighlightedNutrients({
  rows,
  className,
  style,
}: {
  rows: NutrientRow[];
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("animate-fade-up", className)} style={style}>
      <NutrientList label="Nutrients, weekly average vs. daily targets">
        {rows.map((r, i) => (
          <NutrientRingRow key={r.def.key} row={r} index={i} />
        ))}
      </NutrientList>
    </div>
  );
}
