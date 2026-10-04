"use client";

/**
 * Figma call screen "orb stage" (375x290; 5.1 Maya, 5.2 Leo, 5.3 Nova, 5.4 Brock, 5.6 dark):
 * the persona's full-body mascot (200x250) on three soft rings (270 / 214 / 166px) in its own
 * tint, or translucent white in dark mode. The mascot follows the voice state on the next
 * frame (design rules: within 150ms): Leo swaps to his final per-state art, the others get the
 * design's cues (sound arcs while listening, thought bubbles while thinking). The motion:
 *   listening  the rings swell outward in turn, like the room is being heard
 *   speaking   quick small ring pulses, the mascot bobs gently
 *   thinking   a slow breath
 *   idle       still, exactly the design
 * Tapping the mascot is tap-to-talk. `scale` shrinks the whole stage on short phones.
 */
import { motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { MascotFigure, preloadMascotStates } from "@/components/mascot/Mascot";
import type { CallTheme } from "@/components/voice/useCallTheme";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePersona, type PersonaId } from "@/lib/voice/persona";

/** The call frame of each persona: its ring exports carry that persona's soft tint */
const RING_NODE: Record<PersonaId, string> = {
  maya: "2014-2033",
  leo: "2014-2091",
  nova: "2014-2149",
  brock: "2014-2207",
};
/** 5.6 dark mode: white rings at 4% / 7% / 11% */
const DARK_RING_NODE = "2014-2514";

const RINGS = [
  { file: "ellipse-1.svg", size: 270, top: 10 },
  { file: "ellipse-2.svg", size: 214, top: 38 },
  { file: "ellipse-3.svg", size: 166, top: 62 },
] as const;

/** Stage size in the design */
export const STAGE_WIDTH = 375;
export const STAGE_HEIGHT = 290;

function ringMotion(status: VoiceStatus, index: number): TargetAndTransition {
  // index 0 = outer ring; ripples travel from the mascot outward
  const fromInside = RINGS.length - 1 - index;
  switch (status) {
    case "listening":
      return {
        scale: [1, 1.06, 1],
        transition: { duration: 1.8, delay: fromInside * 0.2, repeat: Infinity, ease: "easeInOut" },
      };
    case "speaking":
      return {
        scale: [1, 1.035, 1],
        transition: { duration: 0.75 + index * 0.12, delay: fromInside * 0.08, repeat: Infinity, ease: "easeInOut" },
      };
    case "thinking":
      return {
        scale: [1, 0.975, 1],
        transition: { duration: 2.4, delay: fromInside * 0.15, repeat: Infinity, ease: "easeInOut" },
      };
    default:
      return { scale: 1, transition: { duration: 0.4 } };
  }
}

/** Speaking: a gentle bob (the open mouth is in Leo's art; the bob is every mascot's cue) */
function mascotMotion(status: VoiceStatus): TargetAndTransition {
  if (status === "speaking") {
    return { y: [0, -5, 0], transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } };
  }
  return { y: 0, transition: { duration: 0.15 } };
}

export function OrbStage({
  status,
  theme = "light",
  onClick,
  label,
  scale = 1,
  children,
}: {
  status: VoiceStatus;
  theme?: CallTheme;
  /** Tap-to-talk on the mascot */
  onClick?: () => void;
  /** Accessible name of the mascot button (what a tap does right now) */
  label?: string;
  scale?: number;
  /** Optional overlay inside the stage */
  children?: ReactNode;
}) {
  const persona = usePersona();
  const reduce = useReducedMotion() ?? false;
  const node = theme === "dark" ? DARK_RING_NODE : RING_NODE[persona.id];

  // Every state's art is cached before it's needed, so a state change swaps it on the next frame.
  useEffect(() => preloadMascotStates(persona), [persona]);

  return (
    <div className="relative w-full shrink-0" style={{ height: STAGE_HEIGHT * scale }}>
      <div
        className="absolute left-1/2 top-0"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          marginLeft: -STAGE_WIDTH / 2,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "50% 0",
        }}
      >
        {RINGS.map((r, i) => (
          <motion.img
            key={r.file}
            src={`/figma/v2/${node}/${r.file}`}
            alt=""
            aria-hidden
            width={r.size}
            height={r.size}
            draggable={false}
            className="pointer-events-none absolute block max-w-none select-none"
            style={{ left: (STAGE_WIDTH - r.size) / 2, top: r.top, width: r.size, height: r.size }}
            animate={reduce ? { scale: 1 } : ringMotion(status, i)}
          />
        ))}
        <motion.button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          aria-label={label}
          title={label}
          className={cn(
            "absolute left-[87.5px] top-[26px] block h-[250px] w-[200px] select-none rounded-[48px] outline-none [-webkit-touch-callout:none]",
            onClick && "cursor-pointer",
            theme === "dark" ? "focus-visible:ring-4 focus-visible:ring-white/40" : "focus-visible:ring-4 focus-visible:ring-accent/35",
          )}
          animate={reduce ? { y: 0 } : mascotMotion(status)}
          whileTap={reduce || !onClick ? undefined : { scale: 0.97 }}
        >
          <MascotFigure persona={persona} state={status} width={200} />
        </motion.button>
      </div>
      {children}
    </div>
  );
}
