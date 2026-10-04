"use client";

import type { NutrientRow as Row } from "@/lib/diary/stats";
import { formatAmount, STATUS_LABEL, type NutrientStatus, type NutrientUnit } from "@/lib/nutrients";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";

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

export function StatusBadge({ status, className }: { status: NutrientStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-pill px-[9px] py-1 text-[11px] font-semibold leading-none",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * One nutrient: 42px progress ring with the percentage inside, name + "9 / 18 mg", and a
 * status badge. Render inside a `<ul className="divide-y divide-line">`.
 */
export function NutrientRingRow({ row, index = 0, className }: { row: Row; index?: number; className?: string }) {
  const { def } = row;
  const pct = Math.round(row.ratio * 100);
  const amount = `${amountOnly(row.value, def.unit)} / ${formatAmount(row.target, def.unit)}`;
  return (
    <li className={cn("flex items-center gap-3 p-3", className)}>
      <ProgressRing
        value={row.ratio}
        size={42}
        stroke={5}
        colorClass={STATUS_RING[row.status]}
        trackClass="stroke-line"
        delay={0.1 + index * 0.06}
        label={`${def.label}: ${amount}, ${pct}% of your ${def.kind === "limit" ? "limit" : "target"}`}
      >
        <span className="text-[10px] font-bold leading-none tabular-nums text-ink">{pct}%</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-ink">{def.label}</p>
        <p className="mt-0.5 truncate text-[13px] tabular-nums text-ink-soft">{amount}</p>
      </div>
      <StatusBadge status={row.status} />
    </li>
  );
}
