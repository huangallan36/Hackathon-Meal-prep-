"use client";

import { motion } from "motion/react";
import { clamp, cn } from "@/lib/utils";

/** Rounded bar that grows to `value` (ratio, 1 = full) with a soft spring */
export function ProgressBar({
  value,
  colorClass,
  trackClass = "bg-cream-deep",
  height = "h-2.5",
  delay = 0,
  label,
  className,
}: {
  value: number;
  colorClass: string;
  trackClass?: string;
  height?: string;
  delay?: number;
  /** Accessible description ("Protein: 128 of 150 g") */
  label?: string;
  className?: string;
}) {
  const pct = clamp(Number.isFinite(value) ? value : 0, 0, 1) * 100;
  return (
    <div
      className={cn("w-full overflow-hidden rounded-pill", height, trackClass, className)}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <motion.div
        className={cn("h-full rounded-pill", colorClass)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
      />
    </div>
  );
}
