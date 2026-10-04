"use client";

/**
 * A "Live Activity" for the call, on the simulated phone home screen while Sous is docked
 * (inspired by the lock screen during a live call): the persona's mascot avatar + "Sous · Leo",
 * a LIVE badge, the current recipe step with progress while cooking (else what's being said),
 * and pause / keyboard / end controls.
 */
import { Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { statusLabel } from "@/components/voice/status";
import { HangUpIcon } from "@/components/voice/HangUpIcon";
import { useCallTimer } from "@/components/voice/useCall";
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { openTyping, togglePause, unlockAudio } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";

/** "3:12 left" on the kitchen timer, ticking; null without a running timer */
function useTimerLeft(): string | null {
  const timer = useKitchen((s) => s.timer);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer || timer.doneAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);
  if (!timer) return null;
  const left = Math.max(0, Math.round((timer.endsAt - now) / 1000));
  if (timer.doneAt || left === 0) return "Timer done";
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} left`;
}

export function LiveActivity({ onOpen, onEnd, className }: { onOpen: () => void; onEnd: () => void; className?: string }) {
  const persona = usePersona();
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const interim = useVoice((s) => s.interim);
  const caption = useVoice((s) => s.caption);
  const recipe = useKitchen((s) => (s.activeRecipe && s.finishedRecipeId !== s.activeRecipe.id ? s.activeRecipe : null));
  const stepIndex = useKitchen((s) => s.stepIndex);
  const timerLeft = useTimerLeft();
  const callTime = useCallTimer();

  const total = recipe?.steps.length ?? 0;
  const cooking = recipe != null && total > 0 && stepIndex >= 0;
  const step = cooking ? recipe.steps[Math.min(stepIndex, total - 1)] : null;

  // What the card says: the step while cooking, else the live line.
  let label: string | null = null;
  let text: string | null = null;
  if (cooking && step) {
    label = `STEP ${Math.min(stepIndex, total - 1) + 1} OF ${total}`;
    text = step.text;
  } else if (status === "listening" && !paused) {
    label = "LISTENING";
    text = interim || "Go ahead, I'm listening.";
  } else if (caption) {
    label = persona.name.toUpperCase();
    text = caption;
  }

  const subtitle = recipe ? recipe.title : paused ? `Paused · ${callTime}` : `${statusLabel(status, false)} · ${callTime}`;

  return (
    <section
      aria-label={`Live call with ${persona.name}`}
      className={cn("flex flex-col gap-[14px] rounded-[28px] bg-[rgba(11,15,13,0.72)] p-[18px] backdrop-blur-xl", className)}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open the call with ${persona.name}`}
        className="flex w-full items-center gap-2.5 rounded-[14px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <MascotAvatar persona={persona} size={40} />
        <span className="flex min-w-px flex-1 flex-col gap-px whitespace-nowrap">
          <span className="truncate text-body font-semibold text-white">Sous · {persona.name}</span>
          <span className="truncate text-xs text-white/60">{subtitle}</span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-pill px-2 py-[3px] text-micro font-bold text-white",
            paused ? "bg-white/20" : "bg-flame",
          )}
        >
          {paused ? "PAUSED" : "LIVE"}
        </span>
      </button>

      {label && text && (
        <div className="flex w-full flex-col gap-[3px] font-semibold">
          <p className="text-caption tracking-[0.88px] text-butter">{label}</p>
          <p className={cn("text-white", cooking ? "line-clamp-2 text-lg leading-snug" : "line-clamp-2 text-body leading-snug")}>
            {text}
          </p>
        </div>
      )}

      {cooking && (
        <div className="flex w-full items-center gap-2.5">
          <span className="relative h-1.5 min-w-px flex-1 overflow-hidden rounded-[3px] bg-white/15">
            <span
              className="absolute inset-y-0 left-0 rounded-[3px] bg-butter transition-[width] duration-500"
              style={{ width: `${Math.round(((stepIndex + 1) / total) * 100)}%` }}
            />
          </span>
          <span className="shrink-0 whitespace-nowrap text-xs font-medium text-white/70">
            {timerLeft ?? (stepIndex >= total - 1 ? "Last step" : `${total - stepIndex - 1} steps left`)}
          </span>
        </div>
      )}

      <div className="flex w-full items-start gap-3">
        <ActivityControl label={paused ? "Resume" : "Pause"} onClick={togglePause}>
          {paused ? (
            <Play aria-hidden className="size-5 fill-white text-white" strokeWidth={1.8} />
          ) : (
            <img src="/figma/screens/2-143/icon-pause.svg" alt="" width={20} height={20} className="block size-5" />
          )}
        </ActivityControl>
        <ActivityControl
          label="Type a message"
          onClick={() => {
            unlockAudio();
            openTyping();
          }}
        >
          <img src="/figma/screens/2-143/icon-keyboard.svg" alt="" width={20} height={20} className="block size-5" />
        </ActivityControl>
        <ActivityControl label="End call" tone="end" onClick={onEnd}>
          <HangUpIcon size={20} />
        </ActivityControl>
      </div>
    </section>
  );
}

function ActivityControl({
  label,
  onClick,
  tone = "neutral",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "neutral" | "end";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex min-w-px flex-1 items-center justify-center rounded-pill py-[11px] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        tone === "end" ? "bg-flame hover:brightness-105" : "bg-white/14 hover:bg-white/20",
      )}
    >
      {children}
    </button>
  );
}
