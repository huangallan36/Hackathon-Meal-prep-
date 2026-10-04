"use client";

import { Mic } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { VoiceStatus } from "@/lib/types";

/** Tiny glyph for the compact orb: mic (tap to talk), dots (thinking), bars (speaking). */
export function StatusGlyph({ status, size = 22 }: { status: VoiceStatus; size?: number }) {
  const reduce = useReducedMotion() ?? false;

  if (status === "thinking") {
    return (
      <span className="flex items-center gap-[3px]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block size-[5px] rounded-full bg-white"
            animate={reduce ? undefined : { y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </span>
    );
  }

  if (status === "speaking") {
    const heights = [0.45, 0.85, 1, 0.7, 0.4];
    return (
      <span className="flex items-center gap-[3px]" style={{ height: size }} aria-hidden>
        {heights.map((h, i) => (
          <motion.span
            key={i}
            className="block w-[3px] origin-center rounded-full bg-white"
            style={{ height: size * h }}
            animate={reduce ? undefined : { scaleY: [0.45, 1, 0.6, 0.9, 0.45] }}
            transition={{ duration: 1.1 + i * 0.12, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
          />
        ))}
      </span>
    );
  }

  return <Mic aria-hidden style={{ width: size, height: size }} strokeWidth={2.3} />;
}

export function statusLabel(status: VoiceStatus, paused: boolean): string {
  if (paused) return "Paused";
  switch (status) {
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "speaking":
      return "Speaking";
    default:
      return "Ready";
  }
}
