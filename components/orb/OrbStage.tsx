"use client";

/**
 * Figma 1.2 "orb stage" (375x290): the 124px voice orb on three translucent white discs
 * (270 / 214 / 166px at 4% / 7% / 11%). The discs carry the call's state:
 *   listening  they swell outward in turn, like the room is being heard
 *   speaking   quick, small pulses
 *   thinking   a slow breath, with a thin light ring spinning round the orb
 *   idle       still, exactly the design
 * `scale` shrinks the whole stage on short phones.
 */
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from "motion/react";
import type { VoiceStatus } from "@/lib/types";
import { Orb } from "./Orb";

const DISCS = [
  { size: 270, className: "bg-white/[0.04]" },
  { size: 214, className: "bg-white/[0.07]" },
  { size: 166, className: "bg-white/[0.11]" },
] as const;

/** Stage height in the design */
export const STAGE_HEIGHT = 290;

function discMotion(status: VoiceStatus, index: number): TargetAndTransition {
  // index 0 = outer disc; ripples travel from the orb outward
  const fromInside = DISCS.length - 1 - index;
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

export function OrbStage({
  status,
  onClick,
  activity,
  scale = 1,
  children,
}: {
  status: VoiceStatus;
  onClick?: () => void;
  activity?: number;
  scale?: number;
  /** Overlay at the bottom of the stage (the status hint) */
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="relative flex w-full shrink-0 items-center justify-center" style={{ height: STAGE_HEIGHT * scale }}>
      <div className="relative size-[270px] shrink-0" style={scale === 1 ? undefined : { transform: `scale(${scale})` }}>
        {DISCS.map((d, i) => (
          <motion.span
            key={d.size}
            aria-hidden
            className={`absolute left-1/2 top-1/2 rounded-full ${d.className}`}
            style={{ width: d.size, height: d.size, marginLeft: -d.size / 2, marginTop: -d.size / 2 }}
            animate={reduce ? { scale: 1 } : discMotion(status, i)}
          />
        ))}
        <AnimatePresence>
          {status === "thinking" && !reduce && (
            <motion.span
              key="spinner"
              aria-hidden
              className="absolute left-1/2 top-1/2 -ml-[83px] -mt-[83px] size-[166px] rounded-full"
              style={{
                background: "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg 200deg, rgba(255,255,255,0.55) 360deg)",
                WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
              }}
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              transition={{ opacity: { duration: 0.3 }, rotate: { duration: 1.4, ease: "linear", repeat: Infinity } }}
            />
          )}
        </AnimatePresence>
        <div className="absolute left-1/2 top-1/2 -ml-[62px] -mt-[62px]">
          <Orb status={status} size={124} onClick={onClick} activity={activity} ripples={false} />
        </div>
      </div>
      {children}
    </div>
  );
}
