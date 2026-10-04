"use client";

import { Check, ChevronLeft, ChevronRight, Mic, RotateCcw } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const control =
  "inline-flex h-14 items-center justify-center gap-1.5 rounded-pill font-semibold transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.96] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

function ControlButton({ primary, className, ...rest }: { primary?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        control,
        primary ? "bg-accent px-5 text-base text-white shadow-accent hover:bg-accent-strong" : "bg-surface px-4 text-[15px] text-ink shadow-card hover:bg-cream-deep",
        className,
      )}
      {...rest}
    />
  );
}

/** Back / Repeat / Next (Finish on the last step) */
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
  return (
    <div>
      <div className="grid grid-cols-[auto_auto_1fr] gap-2.5">
        <ControlButton onClick={onBack} aria-label="Previous step">
          <ChevronLeft className="size-5" />
          Back
        </ControlButton>
        <ControlButton onClick={onRepeat} aria-label="Repeat step">
          <RotateCcw className="size-[18px]" />
          Repeat
        </ControlButton>
        <ControlButton primary onClick={onNext} aria-label={isLast ? "Finish cooking" : "Next step"}>
          {isLast ? "Finish" : "Next"}
          {isLast ? <Check className="size-5" /> : <ChevronRight className="size-5" />}
        </ControlButton>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
        <Mic className="size-3.5" />
        Hands busy? Say &ldquo;next&rdquo;, &ldquo;repeat&rdquo; or &ldquo;go back&rdquo;
      </p>
    </div>
  );
}
