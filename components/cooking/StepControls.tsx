"use client";

import { Check, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { ComponentProps } from "react";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { HandsFreePill } from "./HandsFreePill";

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function RoundControl({ className, ...rest }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex size-[52px] shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-cream-deep active:scale-90",
        ring,
        className,
      )}
      {...rest}
    />
  );
}

/**
 * Back / Repeat / Next (Finish on the last step) as a dock that sticks to the bottom of the
 * screen while the step is in view. With no voice session it lines up with the floating orb
 * (same height and baseline, leaving the orb's column free), so orb + dock read as one control
 * bar. During a voice session Sous's caption bubble appears beside the orb, so the dock rises
 * above it and takes the full width. Sticky stays inside its section, so it never covers the
 * video below. The hands-free pill rides on top of the dock (Figma cooking screen).
 */
export function StepControls({
  isLast,
  onBack,
  onRepeat,
  onNext,
}: {
  isLast: boolean;
  onBack: () => void;
  onRepeat: () => void;
  onNext: () => void;
}) {
  const voiceActive = useVoice((s) => s.sessionActive);
  return (
    <div
      className={cn(
        "sticky z-30 transition-[bottom,margin] duration-300 ease-out",
        voiceActive
          ? "bottom-[calc(var(--nav-height)+var(--safe-bottom)+104px)] mr-0"
          : "bottom-[calc(var(--nav-height)+var(--safe-bottom)+14px)] mr-[66px]",
      )}
    >
      {/* The orb's column is free above the dock row: the pill spans (and centers on) the full width. */}
      <div className={cn("mb-2.5 flex justify-center", !voiceActive && "-mr-[66px]")}>
        <HandsFreePill />
      </div>
      <div className="flex items-center gap-1 rounded-pill bg-surface/90 p-1 shadow-lift ring-1 ring-line backdrop-blur-md">
        <RoundControl onClick={onBack} aria-label="Previous step" title="Back">
          <ChevronLeft className="size-6" />
        </RoundControl>
        <RoundControl onClick={onRepeat} aria-label="Repeat step" title="Repeat">
          <RotateCcw className="size-5" />
        </RoundControl>
        <button
          type="button"
          onClick={onNext}
          aria-label={isLast ? "Finish cooking" : "Next step"}
          className={cn(
            "inline-flex h-[52px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-pill px-4 text-base font-semibold text-white shadow-accent transition active:scale-[0.97]",
            "bg-accent hover:bg-accent-strong",
            ring,
          )}
        >
          {isLast ? "Finish" : "Next"}
          {isLast ? <Check className="size-5" strokeWidth={2.6} /> : <ChevronRight className="size-5" />}
        </button>
      </div>
    </div>
  );
}
