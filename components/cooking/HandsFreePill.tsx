"use client";

/**
 * Cooking mode's hands-free pill (Figma cooking screen): the small voice orb plus
 * "Hands-free on · say “next” or “repeat that”". Tapping it toggles conversation mode;
 * turning it on also starts a voice session if needed and opens the mic right away
 * (inside the tap), so the cook never has to touch the screen again. When it's on but no
 * session is running (e.g. after a reload), the tap starts listening instead of turning it off.
 */
import { motion, useReducedMotion } from "motion/react";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { setHandsFreeMode, toggleHandsFree } from "@/lib/voice/engine";

export function HandsFreePill({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const on = usePrefs((s) => s.handsFree);
  const sessionActive = useVoice((s) => s.sessionActive);
  const listening = useVoice((s) => s.sessionActive && !s.paused && s.status === "listening");
  const rest = useVoice((s) => (s.sessionActive ? s.handsFreeRest : null));
  const pulse = on && listening && !reduce;
  // On, but nobody is listening yet (no voice session): the tap starts one instead of turning it off.
  const idleOn = on && !sessionActive;

  let text: string;
  if (!on) text = "Hands-free off · tap to turn on";
  else if (idleOn) text = "Hands-free on · tap to start listening";
  else if (rest === "blocked") text = "Hands-free needs a tap here · use the orb";
  else if (rest) text = "Hands-free resting · tap the orb to talk";
  else text = "Hands-free on · say “next” or “repeat that”";

  return (
    <button
      type="button"
      role={idleOn ? undefined : "switch"}
      aria-checked={idleOn ? undefined : on}
      aria-label={
        idleOn
          ? "Start hands-free listening"
          : on
            ? "Hands-free on. Say next or repeat that. Tap to turn off"
            : "Hands-free off. Tap to turn on"
      }
      onClick={() => (idleOn ? setHandsFreeMode(true, { startSession: true }) : toggleHandsFree({ startSession: true }))}
      className={cn(
        // 36px pill; the ::after keeps a 44px tap target
        "relative mx-auto flex h-9 max-w-full items-center gap-2 rounded-pill pl-1.5 pr-3.5 shadow-soft ring-1 backdrop-blur-md transition active:scale-[0.97]",
        "after:absolute after:-inset-y-1 after:inset-x-0 after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        on ? "bg-flame-soft/95 text-ink ring-flame/20" : "bg-surface/90 text-ink-soft ring-line",
        className,
      )}
    >
      <motion.img
        src="/figma/voices/orb-maya.svg"
        alt=""
        width={24}
        height={24}
        className={cn("size-6 shrink-0 rounded-full", !on && "opacity-60 grayscale-[0.35]")}
        animate={pulse ? { scale: [1, 1.14, 1] } : { scale: 1 }}
        transition={pulse ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      />
      <span className="min-w-0 truncate text-meta font-medium">{text}</span>
    </button>
  );
}
