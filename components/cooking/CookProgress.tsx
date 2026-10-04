import { formatDuration } from "@/lib/cooking/durations";
import { cn } from "@/lib/utils";

/**
 * Sticks the progress right under ScreenHeader (6px top + 40px buttons + 8px bottom), on the
 * same translucent cream. Its own 8px top + 8px bottom keep the design's 16 / 18px rhythm.
 */
export const COOK_PROGRESS_STICKY = "sticky top-[calc(var(--safe-top)+54px)] z-10 bg-cream/90 pb-2 pt-2 backdrop-blur-md";

/**
 * Figma 2.3 progress: "Step 2 of 6" (13 SemiBold) and "~18 min left" (13, ink-soft) over a
 * 6px segmented bar with 4px gaps: done steps green, the current one butter, the rest line.
 * The page keeps it stuck under the header (see COOK_PROGRESS_STICKY) so it never scrolls away.
 */
export function CookProgress({
  index,
  total,
  done = false,
  minutesLeft,
  className,
}: {
  /** 0-based current step */
  index: number;
  total: number;
  /** Every step finished (celebration) */
  done?: boolean;
  minutesLeft?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 px-5", className)}>
      <div className="flex items-start justify-between gap-3 text-meta leading-[normal]">
        <p className="font-semibold text-ink" aria-live="polite">
          {done ? `All ${total} steps done` : `Step ${index + 1} of ${total}`}
        </p>
        <p className="text-ink-soft">
          {done ? "Ready to serve" : minutesLeft != null ? `~${formatDuration(minutesLeft * 60)} left` : null}
        </p>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-label="Recipe progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done ? total : index}
        aria-valuetext={done ? "All steps done" : `Step ${index + 1} of ${total}`}
      >
        {Array.from({ length: total }, (_, j) => (
          <span
            key={j}
            className={cn(
              "h-1.5 min-w-px flex-1 rounded-[3px] transition-colors duration-300",
              done || j < index ? "bg-accent" : j === index ? "bg-butter" : "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
