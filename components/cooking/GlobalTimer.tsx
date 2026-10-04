"use client";

import { BellRing, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cancelTimer, remainingSeconds, ringTimer } from "@/lib/cooking/actions";
import { useNow } from "@/lib/cooking/clock";
import { formatClock } from "@/lib/cooking/durations";
import { useKitchen } from "@/lib/stores/kitchen";
import { COOK_ICON } from "./icons";
import { ProgressRing } from "./ProgressRing";

/**
 * App-wide kitchen timer, rendered by AppShell on every screen.
 * - Rings (chime, vibration, toast, Sous) when the countdown hits zero, on any screen,
 *   including right after a reload if the timer expired while the app was closed.
 * - Off the cook page it shows a compact live pill (the Figma 2.3 butter timer pill) that
 *   links back to cooking mode: at the top center of the desktop phone frame (like an iOS
 *   Live Activity), above the floating orb on real phones.
 */
export function GlobalTimer() {
  const timer = useKitchen((s) => s.timer);
  const recipeId = useKitchen((s) => s.activeRecipe?.id ?? null);
  const pathname = usePathname();
  const running = Boolean(timer && !timer.doneAt);
  const now = useNow(running);

  useEffect(() => {
    if (timer && !timer.doneAt && now >= timer.endsAt) ringTimer(timer);
  }, [now, timer]);

  const onCookPage = pathname.startsWith("/ai/cook/");
  const href = recipeId != null ? `/ai/cook/${recipeId}` : null;

  return (
    <div className="pointer-events-none absolute bottom-[calc(var(--nav-height)+var(--safe-bottom)+86px)] right-4 z-[55] flex justify-end sm:inset-x-0 sm:bottom-auto sm:right-auto sm:top-[5px] sm:justify-center">
      <AnimatePresence>
        {timer && !onCookPage && (
          <motion.div
            key="timer-pill"
            initial={{ opacity: 0, y: -10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto"
          >
            {timer.doneAt ? (
              <DonePill label={timer.label} href={href} />
            ) : (
              <RunningPill
                label={timer.label}
                remaining={remainingSeconds(timer, now)}
                progress={remainingSeconds(timer, now) / Math.max(1, timer.totalSec)}
                href={href}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const pillBase = "relative flex h-[28px] items-center rounded-pill text-meta font-semibold leading-[normal] shadow-lift";
/** Invisible padding so the 28px pill still has a ~44px tap target */
const hitArea = "after:absolute after:-inset-y-2 after:-inset-x-1 after:content-['']";

/** Figma 2.3 timer pill styling: butter-soft, the stopwatch asset, butter-ink text */
function RunningPill({ label, remaining, progress, href }: { label: string; remaining: number; progress: number; href: string | null }) {
  const body = (
    <>
      <ProgressRing progress={progress} size={20} stroke={2} trackClassName="stroke-butter/25" barClassName="stroke-butter" className="rounded-full bg-surface">
        <img src={COOK_ICON.timer} alt="" width={14} height={14} className="relative block size-3.5" />
      </ProgressRing>
      <span className="tabular-nums">{formatClock(remaining)}</span>
      <span className="max-w-[96px] truncate font-medium opacity-80">{label}</span>
    </>
  );
  const cls = `${pillBase} ${hitArea} gap-1.5 bg-butter-soft pl-1 pr-3 text-butter-ink ring-1 ring-butter/30`;
  return href ? (
    <Link href={href} className={cls} aria-label={`${label} timer, ${formatClock(remaining)} left. Open cooking mode`}>
      {body}
    </Link>
  ) : (
    <div className={cls} role="timer">
      {body}
    </div>
  );
}

function DonePill({ label, href }: { label: string; href: string | null }) {
  return (
    <div className={`${pillBase} gap-2 bg-accent pl-3 pr-1 text-white`} role="alert">
      <motion.span
        animate={{ rotate: [0, -16, 14, -10, 8, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.8 }}
        className="inline-flex"
      >
        <BellRing className="size-3.5" />
      </motion.span>
      {href ? (
        <Link href={href} className={`relative ${hitArea}`}>
          <span className="block max-w-[120px] truncate">{label} done</span>
        </Link>
      ) : (
        <span className="max-w-[120px] truncate">{label} done</span>
      )}
      <button
        type="button"
        onClick={cancelTimer}
        aria-label="Dismiss timer"
        className={`relative inline-flex size-[22px] items-center justify-center rounded-full bg-white/20 transition hover:bg-white/30 active:scale-90 ${hitArea}`}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
