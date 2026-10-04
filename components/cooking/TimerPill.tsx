"use client";

import { BellRing, Plus, Timer, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSyncExternalStore } from "react";
import { addMinute, cancelTimer, remainingSeconds } from "@/lib/cooking/actions";
import { useNow } from "@/lib/cooking/clock";
import { formatClock } from "@/lib/cooking/durations";
import { useKitchen } from "@/lib/stores/kitchen";
import { cn } from "@/lib/utils";
import { ProgressRing } from "./ProgressRing";

/* Whether the full timer card is on screen; the header chip only shows when it is not. */
let cardVisible = false;
const visibilityListeners = new Set<() => void>();
function setCardVisible(visible: boolean) {
  if (visible === cardVisible) return;
  cardVisible = visible;
  for (const l of visibilityListeners) l();
}
function subscribeVisibility(listener: () => void) {
  visibilityListeners.add(listener);
  return () => visibilityListeners.delete(listener);
}
function useCardVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => cardVisible, () => false);
}

/** Ref callback: track the timer card against the scroll container (minus the sticky header). */
let observedCard: Element | null = null;
function observeCard(el: HTMLDivElement | null) {
  if (!el || typeof IntersectionObserver === "undefined") return;
  observedCard = el;
  const io = new IntersectionObserver(
    (entries) => {
      // Several entries can be queued before delivery: the last one is the current state.
      const latest = entries[entries.length - 1];
      if (latest && observedCard === el) setCardVisible(latest.isIntersecting);
    },
    { root: document.getElementById("sous-scroll"), rootMargin: "-110px 0px 0px 0px" },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    if (observedCard === el) {
      observedCard = null;
      setCardVisible(false);
    }
  };
}

/**
 * Compact countdown for the sticky header, so the timer stays visible while scrolling a long
 * step (shown only while the full timer card is scrolled away). Tapping it scrolls back up.
 */
export function HeaderTimer() {
  const timer = useKitchen((s) => s.timer);
  const visible = useCardVisible();
  const running = Boolean(timer && !timer.doneAt);
  const now = useNow(running && !visible);
  if (!timer || visible) return null;
  return (
    <button
      type="button"
      onClick={() => document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={timer.doneAt ? `${timer.label} timer done` : `${timer.label} timer, ${formatClock(remainingSeconds(timer, now))} left`}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-pill pl-1.5 pr-3 text-sm font-semibold tabular-nums text-white transition active:scale-95 animate-pop",
        timer.doneAt ? "bg-accent shadow-accent" : "bg-ink shadow-soft",
      )}
    >
      {timer.doneAt ? (
        <span className="flex size-8 items-center justify-center">
          <BellRing className="size-4" />
        </span>
      ) : (
        <ProgressRing progress={remainingSeconds(timer, now) / Math.max(1, timer.totalSec)} size={32} stroke={3} barClassName="stroke-accent">
          <Timer className="size-3.5 text-white/80" />
        </ProgressRing>
      )}
      {timer.doneAt ? "Done" : formatClock(remainingSeconds(timer, now))}
    </button>
  );
}

/**
 * The cook page's kitchen timer: live countdown, +1 min, cancel; a "Time's up" state
 * after it rings (ringing itself is handled app-wide by GlobalTimer).
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
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className={className}
        >
          <div
            ref={observeCard}
            role={timer.doneAt ? "alert" : "timer"}
            className={cn(
              "flex items-center gap-3 rounded-tile px-3 py-2.5 text-white transition-colors duration-300",
              timer.doneAt ? "bg-accent shadow-accent" : "bg-ink shadow-lift",
            )}
          >
            {timer.doneAt ? (
              <motion.span
                animate={{ rotate: [0, -14, 12, -8, 6, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.6 }}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20"
              >
                <BellRing className="size-5" />
              </motion.span>
            ) : (
              <ProgressRing
                progress={remainingSeconds(timer, now) / Math.max(1, timer.totalSec)}
                size={44}
                stroke={4}
                barClassName="stroke-accent"
              >
                <Timer className="size-4 text-white/80" />
              </ProgressRing>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                {timer.doneAt ? "Time's up" : `${timer.label} timer`}
              </p>
              <p className="truncate font-display text-[22px] font-semibold leading-tight tabular-nums">
                {timer.doneAt ? `${timer.label} is done` : formatClock(remainingSeconds(timer, now))}
              </p>
            </div>

            <button
              type="button"
              onClick={addMinute}
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-pill bg-white/15 px-3 text-sm font-semibold transition hover:bg-white/25 active:scale-95"
            >
              <Plus className="size-4" />1 min
            </button>
            <button
              type="button"
              onClick={cancelTimer}
              aria-label={timer.doneAt ? "Dismiss timer" : "Cancel timer"}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-95"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
