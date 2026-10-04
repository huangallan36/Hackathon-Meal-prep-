"use client";

/**
 * Cooking mode's hands-free row (Figma 2.3 sheet): the small orange voice orb plus
 * "Hands-free on · say “next” or “repeat that”". Tapping it toggles conversation mode;
 * turning it on also starts a voice session if needed and opens the mic right away
 * (inside the tap), so the cook never has to touch the screen again. When it's on but no
 * session is running (e.g. after a reload), the tap starts listening instead of turning it off.
 * While Sous is listening it shows what it hears (the floating orb's caption is hidden here).
 */
import { motion, useReducedMotion } from "motion/react";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { setHandsFreeMode, toggleHandsFree } from "@/lib/voice/engine";
import { COOK_ICON } from "./icons";

export function HandsFreePill({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const on = usePrefs((s) => s.handsFree);
  const sessionActive = useVoice((s) => s.sessionActive);
  const listening = useVoice((s) => s.sessionActive && !s.paused && s.status === "listening");
  const interim = useVoice((s) => (s.sessionActive && s.status === "listening" ? s.interim.trim() : ""));
  const rest = useVoice((s) => (s.sessionActive ? s.handsFreeRest : null));
  const pulse = listening && !reduce;
  // On, but nobody is listening yet (no voice session): the tap starts one instead of turning it off.
  const idleOn = on && !sessionActive;

  let text: string;
  if (interim) text = `“${interim}”`;
  else if (!on) text = "Hands-free off · tap to turn on";
  else if (idleOn) text = "Hands-free on · tap to start listening";
  else if (rest === "blocked") text = "Hands-free needs a tap · use the mic";
  else if (rest) text = "Hands-free resting · tap the mic to talk";
  else if (listening) text = "Listening · say “next” or “repeat that”";
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
        // 28px row; the ::after keeps a 44px tap target
        "relative flex w-full items-center gap-2.5 rounded-pill text-left transition active:opacity-70",
        "after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <motion.img
        src={COOK_ICON.voiceOrb}
        alt=""
        width={28}
        height={28}
        className={cn("block size-7 shrink-0 rounded-full transition-[filter,opacity]", !on && "opacity-55 grayscale")}
        animate={pulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={pulse ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-meta font-medium leading-[normal]",
          interim ? "text-ink" : "text-ink-soft",
        )}
      >
        {text}
      </span>
    </button>
  );
}
