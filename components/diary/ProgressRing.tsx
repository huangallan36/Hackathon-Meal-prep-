"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { clamp, cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * SVG progress ring starting at 12 o'clock. `value` is a ratio (1 = goal). With
 * `overClass`, anything past 1 draws as a darker second lap, like activity rings.
 * Colors are stroke utility classes, e.g. "stroke-accent". `trackSrc` draws the track
 * from a Figma ring asset (same size) instead of an SVG circle. Figma's arcs have flat
 * ends: `cap="butt"`.
 */
export function ProgressRing({
  value,
  size,
  stroke,
  colorClass,
  trackClass = "stroke-cream-deep",
  trackSrc,
  overClass,
  cap = "round",
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
  trackSrc?: string;
  overClass?: string;
  cap?: "round" | "butt";
  delay?: number;
  label?: string;
  className?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const v = Number.isFinite(value) ? value : 0;
  const main = clamp(v, 0, 1);
  const over = overClass ? clamp(v - 1, 0, 1) : 0;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {trackSrc && <img src={trackSrc} alt="" width={size} height={size} className="absolute inset-0 block" style={{ width: size, height: size }} />}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90" aria-hidden>
        {!trackSrc && <circle cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} className={trackClass} />}
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap={cap}
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
            strokeLinecap={cap}
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
