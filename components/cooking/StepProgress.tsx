"use client";

import { cn } from "@/lib/utils";

/** "Step 3 of 8" + a segmented bar; each segment jumps to its step. */
export function StepProgress({
  index,
  total,
  done = false,
  onJump,
  className,
}: {
  /** 0-based current step */
  index: number;
  total: number;
  /** All steps finished (celebration) */
  done?: boolean;
  onJump?: (index: number) => void;
  className?: string;
}) {
  const pct = done ? 100 : Math.round(((index + 1) / Math.max(1, total)) * 100);
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-ink-soft" aria-live="polite">
          {done ? (
            <span className="text-herb">All {total} steps done</span>
          ) : (
            <>
              Step <span className="font-display text-xl text-ink">{index + 1}</span> of {total}
            </>
          )}
        </p>
        <p className="text-xs font-semibold tabular-nums text-ink-faint">{pct}%</p>
      </div>
      <div className="-mb-3.5 -mt-1.5 flex gap-1" role="group" aria-label="Steps">
        {Array.from({ length: total }, (_, j) => (
          <button
            key={j}
            type="button"
            aria-label={`Go to step ${j + 1}`}
            aria-current={!done && j === index ? "step" : undefined}
            onClick={() => onJump?.(j)}
            className="group flex h-11 flex-1 items-center"
          >
            <span
              className={cn(
                "h-1.5 w-full rounded-full transition-colors duration-300 group-hover:opacity-80",
                done ? "bg-herb" : j < index ? "bg-accent/45" : j === index ? "bg-accent" : "bg-line",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
