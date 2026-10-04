import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Circular countdown ring. `progress` 0..1 is the part still remaining. */
export function ProgressRing({
  progress,
  size = 44,
  stroke = 4,
  className,
  trackClassName = "stroke-white/20",
  barClassName = "stroke-white",
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className={cn("transition-[stroke-dashoffset] duration-500 ease-linear", barClassName)}
        />
      </svg>
      {children}
    </span>
  );
}
