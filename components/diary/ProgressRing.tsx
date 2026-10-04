"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { clamp, cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * SVG progress ring starting at 12 o'clock. `value` is a ratio (1 = goal). With
 * `overClass`, anything past 1 draws as a darker second lap, like activity rings.
 * Colors are stroke utility classes, e.g. "stroke-accent".
 */
export function ProgressRing({
  value,
  size,
  stroke,
  colorClass,
  trackClass = "stroke-cream-deep",
  overClass,
  delay = 0,
  label,
  className,
  children,
}: {
  value: number;
  size: number;
  stroke: number;
  colorClass: string;
  trackClass?: string;
  overClass?: string;
  delay?: number;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const main = clamp(Number.isFinite(value) ? value : 0, 0, 1);
  const over = overClass ? clamp(value - 1, 0, 1) : 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className={trackClass} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={colorClass}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: main, opacity: main > 0.004 ? 1 : 0 }}
          transition={{ pathLength: { duration: 1.1, ease: EASE, delay }, opacity: { duration: 0.2, delay } }}
        />
        {overClass && (
          <motion.circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={overClass}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: over, opacity: over > 0.004 ? 1 : 0 }}
            transition={{ pathLength: { duration: 0.8, ease: EASE, delay: delay + 0.9 }, opacity: { duration: 0.2, delay: delay + 0.9 } }}
          />
        )}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}
