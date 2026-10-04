"use client";

import type { ReactNode } from "react";
import type { NutrientRow as Row } from "@/lib/diary/stats";
import { formatAmount, STATUS_LABEL, type NutrientStatus, type NutrientUnit } from "@/lib/nutrients";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";

/** Figma 3.2 ring track (42px, 5px #ece6dc) */
const RING_TRACK = "/figma/screens/2-157/ellipse.svg";

/** Figma "Highlighted nutrients": arc color by status (on track green, a bit low amber, low / over orange) */
export const STATUS_RING: Record<NutrientStatus, string> = {
  "on-track": "stroke-accent",
  "a-bit-low": "stroke-butter",
  low: "stroke-flame",
  over: "stroke-flame",
};

export const STATUS_BADGE: Record<NutrientStatus, string> = {
  "on-track": "bg-accent-soft text-accent",
  "a-bit-low": "bg-butter-soft text-butter-ink",
  low: "bg-flame-soft text-flame",
  over: "bg-flame-soft text-flame",
};

/** "1,050" for "1,050 / 1,000 mg": same rounding as formatAmount, without the unit */
export function amountOnly(value: number, unit: NutrientUnit): string {
  return formatAmount(value, unit).replace(/\s\S+$/, "");
}

/** Figma status pill: 11px semibold, 4/9 padding */
export function StatusBadge({ status, className }: { status: NutrientStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-pill px-[9px] py-1 text-caption font-semibold leading-[normal]",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * One nutrient (Figma 3.2): 42px ring with the percentage inside, name + "9 / 18 mg", and a
 * status badge. Render inside <NutrientList>.
 */
export function NutrientRingRow({ row, index = 0, className }: { row: Row; index?: number; className?: string }) {
  const { def } = row;
  const pct = Math.round(row.ratio * 100);
  const amount = `${amountOnly(row.value, def.unit)} / ${formatAmount(row.target, def.unit)}`;
  return (
    <li className={cn("flex items-center gap-3 py-3", className)}>
      <ProgressRing
        value={row.ratio}
        size={42}
        stroke={5}
        cap="butt"
        colorClass={STATUS_RING[row.status]}
        trackSrc={RING_TRACK}
        delay={0.1 + Math.min(index, 12) * 0.05}
        label={`${def.label}: ${amount}, ${pct}% of your ${def.kind === "limit" ? "limit" : "target"}`}
      >
        <span className="text-micro font-bold leading-none tabular-nums text-ink">{pct}%</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold leading-[normal] text-ink">{def.label}</p>
        <p className="mt-px truncate text-xs tabular-nums leading-[normal] text-ink-soft">{amount}</p>
      </div>
      <StatusBadge status={row.status} />
    </li>
  );
}

/** Figma 3.2 list card: white, 1px line, 16px sides, rows divided by 1px lines */
export function NutrientList({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <ul aria-label={label} className={cn("rounded-card bg-surface px-4 py-1 shadow-card [&>li+li]:border-t [&>li+li]:border-line", className)}>
      {children}
    </ul>
  );
}
