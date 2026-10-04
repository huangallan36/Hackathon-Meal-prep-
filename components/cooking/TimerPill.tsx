"use client";

import { BellRing, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { addMinute, cancelTimer, remainingSeconds } from "@/lib/cooking/actions";
import { useNow } from "@/lib/cooking/clock";
import { formatClock } from "@/lib/cooking/durations";
import { useKitchen } from "@/lib/stores/kitchen";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";
import { ProgressRing } from "./ProgressRing";

/** 32px round button inside the pill; the ::after keeps a 44px tap target */
const pillButton =
  "relative inline-flex h-8 shrink-0 items-center justify-center rounded-pill text-xs font-semibold transition active:scale-95 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * The cook page's kitchen timer, riding at the top of the bottom sheet so it is always in
 * view: a butter-soft pill (Figma "Start 5:00 timer" styling) with a countdown ring, +1 min
 * and cancel; green "Time's up" after it rings (ringing itself is handled app-wide by GlobalTimer).
 */
export function TimerPill({ className }: { className?: string }) {
  const timer = useKitchen((s) => s.timer);
  const running = Boolean(timer && !timer.doneAt);
  const now = useNow(running);

  return (
    <AnimatePresence initial={false}>
      {timer && (
        <motion.div
          key="cook-timer"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className={cn("overflow-visible", className)}
        >
          <div
            role={timer.doneAt ? "alert" : "timer"}
            aria-label={timer.doneAt ? `${timer.label} timer done` : `${timer.label} timer`}
            className={cn(
              "flex items-center gap-2.5 rounded-pill py-1.5 pl-1.5 pr-1.5 transition-colors duration-300",
              timer.doneAt ? "bg-accent text-white" : "bg-butter-soft text-butter-ink",
            )}
          >
            {timer.doneAt ? (
              <motion.span
                animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20"
              >
                <BellRing className="size-4" />
              </motion.span>
            ) : (
              <ProgressRing
                progress={remainingSeconds(timer, now) / Math.max(1, timer.totalSec)}
                size={32}
                stroke={3}
                trackClassName="stroke-butter/25"
                barClassName="stroke-butter"
                className="rounded-full bg-surface"
              >
                <img src={COOK_ICON.timer} alt="" width={14} height={14} className="relative block size-3.5" />
              </ProgressRing>
            )}

            <p className="min-w-0 flex-1 truncate text-meta leading-[normal]">
              {timer.doneAt ? (
                <span className="font-semibold">{timer.label} is done</span>
              ) : (
                <>
                  <span className="font-medium">{timer.label}</span>
                  <span aria-hidden> · </span>
                  <span className="font-semibold tabular-nums">{formatClock(remainingSeconds(timer, now))}</span>
                </>
              )}
            </p>

            <button
              type="button"
              onClick={addMinute}
              className={cn(pillButton, "gap-0.5 px-3", timer.doneAt ? "bg-white/20 hover:bg-white/30" : "bg-surface hover:bg-cream")}
            >
              <Plus className="size-3.5" strokeWidth={2.4} />1 min
            </button>
            <button
              type="button"
              onClick={cancelTimer}
              aria-label={timer.doneAt ? "Dismiss timer" : "Cancel timer"}
              className={cn(pillButton, "w-8", timer.doneAt ? "bg-white/20 hover:bg-white/30" : "bg-surface hover:bg-cream")}
            >
              <X className="size-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
