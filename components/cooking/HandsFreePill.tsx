"use client";

/**
 * Cooking mode's hands-free row (Figma 2.3 "cook controls"): the chosen voice's 28px
 * MascotAvatar plus "Talk to Leo · ask anything, or say what’s next" (13 Medium, ink-soft). Tapping it
 * toggles conversation mode; turning it on also starts a voice session if needed and opens
 * the mic right away (inside the tap), so the cook never has to touch the screen again. When
 * it's on but no session is running (e.g. after a reload), the tap starts listening instead
 * of turning it off. While Sous is listening it shows what it hears (the floating orb's
 * caption is hidden here) and the mascot breathes (its "listening" cue at this size); otherwise
 * it sits idle, and the text says whether hands-free is on.
 */
import { motion, useReducedMotion } from "motion/react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { setHandsFreeMode, toggleHandsFree } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";

export function HandsFreePill({ className }: { className?: string }) {
  const reduce = useReducedMotion() ?? false;
  const persona = usePersona();
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
  else if (listening) text = `${persona.name}’s listening · just talk`;
  else text = `Talk to ${persona.name} · ask anything, or say what’s next`;

  return (
    <button
      type="button"
      role={idleOn ? undefined : "switch"}
      aria-checked={idleOn ? undefined : on}
      aria-label={
        idleOn
          ? "Start hands-free listening"
          : on
            ? "Hands-free on. Ask anything or say what's next. Tap to turn off"
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
      <motion.span
        className="flex shrink-0 rounded-full"
        animate={pulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={pulse ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
      >
        <MascotAvatar persona={persona} size={28} />
      </motion.span>
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
