"use client";

/**
 * Sous's signature orb: a warm glassy sphere (tomato -> peach -> butter) with an inner
 * swirl. One rAF loop drives scale, spin and glow through motion values (no re-renders),
 * easing smoothly between states:
 *   idle      slow breathing
 *   listening brighter, larger, ripple rings
 *   thinking  fast swirl + shimmer sweep
 *   speaking  lively noise-driven pulse + soft ripples
 */
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<VoiceStatus, string> = {
  idle: "Talk to Sous",
  listening: "Listening. Tap when you're done",
  thinking: "Sous is thinking",
  speaking: "Sous is speaking. Tap to interrupt",
};

interface Tuning {
  /** resting scale */
  scale: number;
  /** swirl speed, degrees per second */
  spin: number;
  /** outer glow opacity */
  glow: number;
  /** speech-like noise amplitude added to scale */
  wobble: number;
  /** breathing amplitude */
  breathe: number;
}

const TUNING: Record<VoiceStatus, Tuning> = {
  idle: { scale: 1, spin: 9, glow: 0.5, wobble: 0, breathe: 0.022 },
  listening: { scale: 1.07, spin: 26, glow: 0.95, wobble: 0.012, breathe: 0.012 },
  thinking: { scale: 0.98, spin: 150, glow: 0.7, wobble: 0, breathe: 0.008 },
  speaking: { scale: 1, spin: 48, glow: 0.85, wobble: 0.08, breathe: 0 },
};

// Gradients are the one place raw colors are allowed: tomato, peach and butter from the palette.
const BODY =
  "radial-gradient(circle at 30% 24%, #ffe2b0 0%, #ffbb84 16%, #ff8a5c 36%, #f2542d 62%, #c93c18 100%)";
const SWIRL =
  "conic-gradient(from 0deg, #ffc76e, #ff7a45 18%, #f2542d 34%, #ff9e6b 52%, #ffd98a 68%, #ff6a3d 84%, #ffc76e)";
const BLOB = "radial-gradient(circle at 68% 34%, rgba(255,214,128,0.95) 0%, rgba(255,214,128,0) 46%)";
const BLOB_2 = "radial-gradient(circle at 30% 72%, rgba(214,55,22,0.85) 0%, rgba(214,55,22,0) 50%)";
const SHIMMER = "conic-gradient(from 0deg, transparent 0 64%, rgba(255,255,255,0.75) 78%, transparent 90%)";
const HIGHLIGHT =
  "radial-gradient(circle at 32% 22%, rgba(255,251,240,0.95) 0%, rgba(255,240,214,0.55) 11%, rgba(255,230,190,0) 32%), radial-gradient(circle at 70% 85%, rgba(120,24,6,0.38) 0%, rgba(120,24,6,0) 52%)";
const GLOW = "radial-gradient(circle, rgba(242,84,45,0.5) 0%, rgba(255,138,92,0.28) 36%, rgba(255,199,110,0) 68%)";

/** Smooth pseudo-noise in [-1, 1] from a few incommensurate sines */
function noise(s: number): number {
  return (Math.sin(s * 7.3) + 0.6 * Math.sin(s * 11.9 + 1.7) + 0.35 * Math.sin(s * 17.3 + 0.4)) / 1.95;
}

export interface OrbProps {
  status?: VoiceStatus;
  /** Diameter in px */
  size?: number;
  onClick?: () => void;
  className?: string;
  /** Overrides the default status label for screen readers */
  label?: string;
  /** Bump the orb whenever this changes (e.g. interim transcript length) */
  activity?: number;
  /** Optional glyph centered on the orb (the compact floating orb uses an icon) */
  children?: ReactNode;
}

export function Orb({ status = "idle", size = 120, onClick, className, label, activity, children }: OrbProps) {
  const reduce = useReducedMotion() ?? false;
  const scale = useMotionValue(TUNING[status].scale);
  const rotate = useMotionValue(0);
  const glow = useMotionValue(TUNING[status].glow);
  const counterRotate = useTransform(rotate, (r) => -r * 1.6);
  const shimmerRotate = useTransform(rotate, (r) => r * 2);
  const glowScale = useTransform(scale, (s) => 0.92 + (s - 1) * 1.8);

  const statusRef = useRef(status);
  const bump = useRef(0);
  const live = useRef<Tuning>({ ...TUNING[status] });

  useEffect(() => {
    statusRef.current = status;
    if (reduce) {
      scale.set(TUNING[status].scale);
      glow.set(TUNING[status].glow);
    }
  }, [status, reduce, scale, glow]);

  useEffect(() => {
    if (activity) bump.current = 1;
  }, [activity]);

  useAnimationFrame((time, delta) => {
    if (reduce) return;
    const dt = Math.min(delta, 64);
    const target = TUNING[statusRef.current];
    const L = live.current;
    const k = 1 - Math.exp(-dt / 280);
    L.scale += (target.scale - L.scale) * k;
    L.spin += (target.spin - L.spin) * k;
    L.glow += (target.glow - L.glow) * k;
    L.wobble += (target.wobble - L.wobble) * k;
    L.breathe += (target.breathe - L.breathe) * k;

    const s = time / 1000;
    const breath = Math.sin((s * 2 * Math.PI) / 3.6) * L.breathe;
    const talk = ((noise(s) + 1) / 2) * L.wobble;
    bump.current *= Math.exp(-dt / 200);

    scale.set(L.scale + breath + talk + bump.current * 0.035);
    rotate.set((rotate.get() + (L.spin * dt) / 1000) % 360);
    glow.set(Math.min(1, L.glow + talk * 2.5));
  });

  const showRipples = !reduce && (status === "listening" || status === "speaking");
  const rippleDuration = status === "listening" ? 2.2 : 1.6;

  const visual = (
    <>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-[30%] rounded-full blur-md"
        style={{ background: GLOW, opacity: glow, scale: glowScale }}
      />

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
                className={cn(
                  "absolute inset-0 rounded-full border-2",
                  status === "listening" ? "border-accent/45" : "border-accent/25",
                )}
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.7, opacity: 0 }}
                transition={{
                  duration: rippleDuration,
                  delay: (i * rippleDuration) / 3,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.span
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          scale,
          background: BODY,
          boxShadow:
            "inset 0 -12px 28px rgba(140,30,10,0.35), inset 0 10px 24px rgba(255,240,214,0.45), 0 18px 40px -14px rgba(242,84,45,0.7)",
        }}
      >
        <motion.span
          className="absolute -inset-[30%] opacity-70 mix-blend-soft-light"
          style={{ background: SWIRL, rotate, filter: `blur(${Math.round(size * 0.08)}px)` }}
        />
        <motion.span
          className="absolute -inset-[15%]"
          style={{ background: BLOB, rotate, filter: `blur(${Math.round(size * 0.05)}px)` }}
        />
        <motion.span
          className="absolute -inset-[15%] opacity-80"
          style={{ background: BLOB_2, rotate: counterRotate, filter: `blur(${Math.round(size * 0.06)}px)` }}
        />
        <motion.span
          className="absolute -inset-[10%] mix-blend-overlay"
          style={{ background: SHIMMER, rotate: shimmerRotate, filter: `blur(${Math.round(size * 0.04)}px)` }}
          initial={false}
          animate={{ opacity: status === "thinking" ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />
        <span className="absolute inset-0 rounded-full" style={{ background: HIGHLIGHT }} />
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
      </motion.span>

      {children && (
        <span className="pointer-events-none relative z-10 flex size-full items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(120,24,6,0.45)]">
          {children}
        </span>
      )}
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

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label ?? LABELS[status]}
      title={label ?? LABELS[status]}
      whileTap={reduce ? undefined : { scale: 0.94 }}
      className={cn(
        "relative isolate shrink-0 cursor-pointer select-none rounded-full outline-none",
        "focus-visible:ring-4 focus-visible:ring-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        className,
      )}
      style={box}
    >
      {visual}
    </motion.button>
  );
}
