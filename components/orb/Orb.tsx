"use client";

/**
 * The voice orb from the Figma file: a flat radial gradient (Maya #f7cf7a -> #e0603a; Leo
 * and Nova use their own colors) with a white seven-bar waveform. It is the animated
 * version of the /figma/voices/orb-*.svg assets, used wherever the orb reacts to the voice:
 * the call screen, the floating orb and the docked bubble. One rAF loop drives the bars
 * and the body scale through motion values (no re-renders), easing between states:
 *   idle      the design's waveform, barely breathing
 *   listening taller lively bars that jump with what you say, ripple rings
 *   thinking  bars shrink to dots and a wave runs through them, a sheen spins round
 *   speaking  bars dance like a voice meter, the body pulses
 * Reduced motion: the static design waveform (dots while thinking).
 */
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef } from "react";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePersona, type Persona } from "@/lib/voice/persona";

/** Figma voice-orb waveform: 7 bars, as fractions of the orb's diameter (same in every size) */
const BAR_HEIGHTS = [0.121, 0.22, 0.341, 0.44, 0.341, 0.22, 0.121] as const;
const BAR_WIDTH = 0.045;
const BAR_STEP = 0.0855;
/** Speaking: louder in the middle, like the design's shape */
const ENVELOPE = [0.55, 0.75, 0.9, 1, 0.9, 0.75, 0.55] as const;

const BODY_SCALE: Record<VoiceStatus, number> = { idle: 1, listening: 1.035, thinking: 0.975, speaking: 1 };

/** Smooth pseudo-noise in [-1, 1] from a few incommensurate sines */
function noise(s: number): number {
  return (Math.sin(s * 7.3) + 0.6 * Math.sin(s * 11.9 + 1.7) + 0.35 * Math.sin(s * 17.3 + 0.4)) / 1.95;
}

/** Bar height (fraction of the diameter) for a status at time `s` seconds */
function barTarget(status: VoiceStatus, i: number, s: number, bump: number): number {
  const base = BAR_HEIGHTS[i];
  switch (status) {
    case "listening": {
      const wave = (Math.sin(s * 4.2 + i * 0.9) + 1) / 2;
      return Math.min(0.6, base * (0.7 + 0.35 * wave + bump * 0.6));
    }
    case "thinking": {
      const wave = Math.max(0, Math.sin(s * 5.2 - i * 0.75));
      return BAR_WIDTH + wave * 0.11;
    }
    case "speaking": {
      const n = (noise(s * 1.25 + i * 1.71) + 1) / 2;
      return 0.07 + 0.45 * ENVELOPE[i] * (0.3 + 0.7 * n);
    }
    default:
      return base * (1 + 0.05 * Math.sin((s * 2 * Math.PI) / 3.6 + i * 0.45));
  }
}

function labelFor(status: VoiceStatus, name: string): string {
  switch (status) {
    case "listening":
      return "Listening. Tap when you're done";
    case "thinking":
      return `${name} is thinking`;
    case "speaking":
      return `${name} is speaking. Tap to interrupt`;
    default:
      return `Talk to ${name}`;
  }
}

export interface OrbProps {
  status?: VoiceStatus;
  /** Diameter in px */
  size?: number;
  onClick?: () => void;
  className?: string;
  /** Overrides the default status label for screen readers */
  label?: string;
  /** Bump the bars whenever this changes (e.g. interim transcript length) */
  activity?: number;
  /** Whose colors (defaults to the chosen persona) */
  persona?: Persona;
  /** Ripple rings while listening/speaking (off on the call screen, where the discs pulse) */
  ripples?: boolean;
  /** Soft colored shadow, for orbs that float over content */
  floating?: boolean;
}

export function Orb({
  status = "idle",
  size = 124,
  onClick,
  className,
  label,
  activity,
  persona: personaProp,
  ripples = true,
  floating = false,
}: OrbProps) {
  const chosen = usePersona();
  const persona = personaProp ?? chosen;
  const reduce = useReducedMotion() ?? false;

  const scale = useMotionValue(1);
  const spin = useMotionValue(0);
  const b0 = useMotionValue(1);
  const b1 = useMotionValue(1);
  const b2 = useMotionValue(1);
  const b3 = useMotionValue(1);
  const b4 = useMotionValue(1);
  const b5 = useMotionValue(1);
  const b6 = useMotionValue(1);
  const bars: MotionValue<number>[] = [b0, b1, b2, b3, b4, b5, b6];

  const statusRef = useRef(status);
  const bump = useRef(0);
  const heights = useRef<number[]>([...BAR_HEIGHTS]);
  const bodyScale = useRef(1);

  useEffect(() => {
    statusRef.current = status;
    if (!reduce) return;
    // Reduced motion: hold the state's resting pose.
    scale.set(1);
    BAR_HEIGHTS.forEach((h, i) => bars[i].set(status === "thinking" ? BAR_WIDTH / h : 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the bar motion values are stable
  }, [status, reduce, scale]);

  useEffect(() => {
    if (activity) bump.current = 1;
  }, [activity]);

  useAnimationFrame((time, delta) => {
    if (reduce) return;
    const dt = Math.min(delta, 64);
    const s = time / 1000;
    const st = statusRef.current;
    bump.current *= Math.exp(-dt / 220);
    const kBars = 1 - Math.exp(-dt / 110);
    const kBody = 1 - Math.exp(-dt / 280);

    const h = heights.current;
    for (let i = 0; i < 7; i++) {
      h[i] += (barTarget(st, i, s, bump.current) - h[i]) * kBars;
      bars[i].set(h[i] / BAR_HEIGHTS[i]);
    }

    bodyScale.current += (BODY_SCALE[st] - bodyScale.current) * kBody;
    const breathe = st === "idle" ? 0.012 * Math.sin((s * 2 * Math.PI) / 3.6) : 0;
    const talk = st === "speaking" ? 0.03 * ((noise(s * 0.9) + 1) / 2) : 0;
    scale.set(bodyScale.current + breathe + talk + bump.current * 0.025);
    if (st === "thinking") spin.set((spin.get() + (dt * 300) / 1000) % 360);
  });

  const showRipples = ripples && !reduce && (status === "listening" || status === "speaking");
  const rippleDuration = status === "listening" ? 2.2 : 1.6;
  const barWidth = size * BAR_WIDTH;

  const visual = (
    <>
      <AnimatePresence>
        {showRipples && (
          <motion.span
            key={`ripples-${status}`}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: `${persona.orbTo}${status === "listening" ? "73" : "40"}` }}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: rippleDuration, delay: (i * rippleDuration) / 3, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      {/* The mask keeps Safari clipping the spinning sheen to the circle */}
      <motion.span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full [mask-image:radial-gradient(white,black)]"
        style={{
          scale,
          background: `radial-gradient(circle closest-side, ${persona.orbFrom} 0%, ${persona.orbTo} 100%)`,
          boxShadow: floating
            ? `0 ${Math.round(size * 0.1)}px ${Math.round(size * 0.26)}px -${Math.round(size * 0.1)}px ${persona.orbTo}a6`
            : undefined,
        }}
      >
        <motion.span
          className="absolute -inset-[10%] mix-blend-soft-light"
          style={{
            rotate: spin,
            background: "conic-gradient(from 0deg, transparent 0 62%, rgba(255,255,255,0.9) 82%, transparent 96%)",
          }}
          initial={false}
          animate={{ opacity: status === "thinking" && !reduce ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />
      </motion.span>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ gap: size * (BAR_STEP - BAR_WIDTH) }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <motion.span
            key={i}
            className="block shrink-0 rounded-full bg-white/95"
            style={{ width: barWidth, height: size * h, scaleY: bars[i] }}
          />
        ))}
      </span>
    </>
  );

  const box = { width: size, height: size };

  if (!onClick) {
    return (
      <div aria-hidden className={cn("relative isolate shrink-0 rounded-full", className)} style={box}>
        {visual}
      </div>
    );
  }

  const text = label ?? labelFor(status, persona.name);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      className={cn(
        "relative isolate shrink-0 cursor-pointer select-none rounded-full outline-none",
        // Amber reads on both the cream screens and the dark call screen
        "focus-visible:ring-4 focus-visible:ring-butter/70",
        className,
      )}
      style={box}
    >
      {visual}
    </motion.button>
  );
}
