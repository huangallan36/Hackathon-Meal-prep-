"use client";

/**
 * The AI's face on the small voice surfaces (the floating tap-to-talk button, the docked
 * bubble): the chosen persona's MascotAvatar (design rules: 24–64px = the head in its soft
 * circle), with rings in the persona's tint that follow the voice:
 *   listening  ripples travel outward (it's hearing you)
 *   speaking   quicker, smaller ripples and a gentle pulse
 *   thinking   a thin arc spins round the avatar
 *   idle       just the avatar
 * Reduced motion: a still ring while listening or speaking.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePersona, type Persona } from "@/lib/voice/persona";

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

/** "#3d6b2e" + alpha (0..1) -> "#3d6b2e8c" */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;
}

export interface VoiceAvatarProps {
  status?: VoiceStatus;
  /** Avatar diameter in px (24–64 per the design rules) */
  size?: number;
  onClick?: () => void;
  /** Overrides the default status label for screen readers */
  label?: string;
  /** Whose face (defaults to the chosen persona) */
  persona?: Persona;
  /** White rim and a soft shadow, for avatars that float over content */
  floating?: boolean;
  /** Ring colour: the persona's tint (light screens) or its soft tint (dark backdrops like the dock wallpaper) */
  ringTone?: "tint" | "soft";
  className?: string;
}

export function VoiceAvatar({
  status = "idle",
  size = 60,
  onClick,
  label,
  persona: personaProp,
  floating = false,
  ringTone = "tint",
  className,
}: VoiceAvatarProps) {
  const chosen = usePersona();
  const persona = personaProp ?? chosen;
  const reduce = useReducedMotion() ?? false;
  const listening = status === "listening";
  const ringed = listening || status === "speaking";
  const duration = listening ? 2.2 : 1.5;
  const ring = ringTone === "soft" ? persona.soft : persona.tint;

  const visual = (
    <>
      <AnimatePresence>
        {ringed && !reduce && (
          <motion.span
            key={`rings-${status}`}
            aria-hidden
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: withAlpha(ring, listening ? 0.75 : 0.55) }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: listening ? 1.6 : 1.38, opacity: 0 }}
                transition={{ duration, delay: (i * duration) / 3, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      {ringed && reduce && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-[5px] rounded-full border-2"
          style={{ borderColor: withAlpha(ring, 0.6) }}
        />
      )}
      <AnimatePresence>
        {status === "thinking" && !reduce && (
          <motion.span
            key="thinking"
            aria-hidden
            className="pointer-events-none absolute -inset-[5px] rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg 200deg, ${ring} 360deg)`,
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
            }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 1, rotate: 360 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ opacity: { duration: 0.25 }, rotate: { duration: 1.4, ease: "linear", repeat: Infinity } }}
          />
        )}
      </AnimatePresence>
      <motion.span
        className={cn(
          "relative flex rounded-full",
          floating && "shadow-[0_10px_24px_-10px_rgb(30_29_26/0.55)] ring-[3px] ring-surface",
        )}
        animate={!reduce && status === "speaking" ? { scale: [1, 1.045, 1] } : { scale: 1 }}
        transition={
          !reduce && status === "speaking" ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }
        }
      >
        <MascotAvatar persona={persona} size={size} />
      </motion.span>
    </>
  );

  const box = { width: size, height: size };

  if (!onClick) {
    // A span: it often sits inside the caller's own button (the docked bubble)
    return (
      <span aria-hidden className={cn("relative isolate block shrink-0 rounded-full", className)} style={box}>
        {visual}
      </span>
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
        "focus-visible:ring-4 focus-visible:ring-accent/40",
        className,
      )}
      style={box}
    >
      {visual}
    </motion.button>
  );
}
