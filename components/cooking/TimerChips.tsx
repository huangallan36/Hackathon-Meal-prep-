"use client";

import { startTimer } from "@/lib/cooking/actions";
import { formatClock, type StepTimer } from "@/lib/cooking/durations";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";

/**
 * Figma 2.3 "Start 5:00 timer" pill: butter-soft, 14px stopwatch, 12px Medium butter-ink.
 * The running one reads "Restart 5:00" with a butter ring.
 */
export function TimerChip({ timer, className }: { timer: StepTimer; className?: string }) {
  const current = useKitchen((s) => s.timer);
  const active = Boolean(current && !current.doneAt && current.label === timer.label && current.totalSec === timer.seconds);
  return (
    <button
      type="button"
      onClick={() => {
        const replacing = Boolean(current && !current.doneAt);
        startTimer(timer.seconds, timer.label);
        toast(replacing ? `Timer restarted: ${timer.label}` : `${timer.label} timer started`, "default", 1800);
      }}
      aria-label={active ? `Restart the ${timer.label.toLowerCase()} timer, ${formatClock(timer.seconds)}` : undefined}
      className={cn(
        // 28px pill; the ::after keeps a 44px tap target
        "relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill bg-butter-soft px-3 py-1.5 text-xs font-medium leading-[normal] text-butter-ink transition active:scale-95",
        "after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active && "ring-[1.5px] ring-butter",
        className,
      )}
    >
      <img src={COOK_ICON.timer} alt="" width={14} height={14} className="block size-3.5" />
      {active ? `Restart ${formatClock(timer.seconds)}` : `Start ${formatClock(timer.seconds)} timer`}
    </button>
  );
}

/** Every timer found in a step, as pills */
export function TimerChips({ timers, className }: { timers: StepTimer[]; className?: string }) {
  if (!timers.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {timers.map((t) => (
        <TimerChip key={`${t.label}-${t.seconds}`} timer={t} />
      ))}
    </div>
  );
}
