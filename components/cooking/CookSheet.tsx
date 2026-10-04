"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { orbTap } from "@/lib/voice/engine";
import { HandsFreePill } from "./HandsFreePill";
import { COOK_ICON } from "./icons";
import { TimerPill } from "./TimerPill";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/** Figma 2.3 primary: 54px green pill, 16px SemiBold white label. For a <button> or <Link>. */
export const sheetPrimaryClass = cn(
  "inline-flex h-[54px] min-w-0 flex-1 items-center justify-center gap-2 rounded-pill bg-accent px-5 text-base font-semibold leading-[normal] text-white transition active:scale-[0.97] hover:bg-accent-strong",
  focusRing,
);

/**
 * Figma 2.3 "cook controls": the white bottom sheet (radius 28 on top, the design's only
 * shadow) with the running timer, the hands-free row, then back / primary / mic.
 *
 * It is `sticky` at the end of the page's full-height column: it stays on screen while the
 * steps scroll, and once you reach the end it sits below the last step instead of covering
 * it, so nothing (like a Start timer pill) can end up hidden behind it.
 */
export function CookSheet({
  children,
  onBack,
  backLabel = "Previous step",
  className,
}: {
  /** The primary action, styled with sheetPrimaryClass */
  children: ReactNode;
  /** Omit to hide the back circle (overview) */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 mt-auto flex flex-col gap-3 rounded-t-[28px] bg-surface px-5 pt-4 shadow-lift",
        // 30px in the desktop frame (home indicator), the device's safe area on phones
        "pb-[max(16px,calc(var(--safe-bottom)+8px))]",
        className,
      )}
    >
      <TimerPill />
      <HandsFreePill />
      <div className="flex items-start gap-2.5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            title={backLabel}
            className={cn(
              "inline-flex size-[54px] shrink-0 items-center justify-center rounded-full bg-cream transition hover:bg-cream-deep active:scale-90",
              focusRing,
            )}
          >
            <img src={COOK_ICON.stepBack} alt="" width={22} height={22} className="block size-[22px]" />
          </button>
        )}
        {children}
        <MicButton />
      </div>
    </div>
  );
}

/** 54px flame-soft mic circle: the orb's tap (talk, or stop listening), with a ring while listening */
function MicButton() {
  const reduce = useReducedMotion() ?? false;
  const status = useVoice((s) => (s.sessionActive && !s.paused ? s.status : "idle"));
  const listening = status === "listening";
  const label = listening ? "Stop listening" : status === "speaking" ? "Interrupt and talk to Sous" : "Talk to Sous";
  return (
    <button
      type="button"
      onClick={orbTap}
      aria-label={label}
      title={label}
      aria-pressed={listening}
      className={cn(
        "relative inline-flex size-[54px] shrink-0 items-center justify-center rounded-full bg-flame-soft transition hover:brightness-[0.98] active:scale-90",
        focusRing,
      )}
    >
      {listening && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-flame"
          initial={{ scale: 1, opacity: 0.9 }}
          animate={reduce ? { opacity: 0.9 } : { scale: [1, 1.22], opacity: [0.9, 0] }}
          transition={reduce ? undefined : { duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {status === "thinking" && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-flame/15"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
      )}
      <img src={COOK_ICON.mic} alt="" width={22} height={22} className="relative block size-[22px]" />
    </button>
  );
}
