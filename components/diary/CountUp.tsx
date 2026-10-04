"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import { fmt } from "@/lib/diary/stats";
import { cn } from "@/lib/utils";

/**
 * Animated number. Counts up from 0 on mount, then tweens from the previous value
 * whenever `value` changes (e.g. picking another day). No React re-renders per frame.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 0.9,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (v) => fmt(v, decimals));

  useEffect(() => {
    const controls = animate(mv, value, { duration: reduce ? 0 : duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [mv, value, duration, reduce]);

  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}
