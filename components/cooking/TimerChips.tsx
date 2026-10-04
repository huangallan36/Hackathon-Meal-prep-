"use client";

import { Timer, TimerReset } from "lucide-react";
import { startTimer } from "@/lib/cooking/actions";
import { formatClock, type StepTimer } from "@/lib/cooking/durations";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import { cn } from "@/lib/utils";

/** "Start 20:00 timer" buttons for the durations found in a step */
export function TimerChips({ timers, className }: { timers: StepTimer[]; className?: string }) {
  const current = useKitchen((s) => s.timer);
  if (!timers.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {timers.map((t) => {
        const active = Boolean(current && !current.doneAt && current.label === t.label && current.totalSec === t.seconds);
        return (
          <button
            key={`${t.label}-${t.seconds}`}
            type="button"
            onClick={() => {
              const replacing = Boolean(current && !current.doneAt);
              startTimer(t.seconds, t.label);
              toast(replacing ? `Timer restarted: ${t.label}` : `${t.label} timer started`, "default", 1800);
            }}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold transition active:scale-95 animate-pop",
              active ? "bg-ink text-white" : "bg-accent-soft text-accent-strong hover:bg-accent hover:text-white",
            )}
          >
            {active ? <TimerReset className="size-4" /> : <Timer className="size-4" />}
            {active ? `Restart ${formatClock(t.seconds)}` : `Start ${formatClock(t.seconds)} timer`}
          </button>
        );
      })}
    </div>
  );
}
