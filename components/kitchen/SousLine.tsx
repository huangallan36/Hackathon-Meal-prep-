"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/voice/persona";

/** The chosen voice's mascot head in its soft circle (design rules v1: 24–64px avatars) */
export function SousAvatar({ size = 30, className }: { size?: number; className?: string }) {
  const persona = usePersona();
  return <MascotAvatar persona={persona} size={size} className={className} />;
}

/**
 * Something Sous says, in the Figma 2.2 listening-banner style ("Leo's listening. Try …"):
 * the voice's soft tint, radius 16, its 30px mascot avatar and the line in 13px Medium in the
 * voice's ink. Design rules v1: mascots appear wherever the AI speaks. It fades in on mount;
 * give it a `key` to replay that for a new line.
 */
export function SousLine({
  children,
  className,
  live = false,
}: {
  children: ReactNode;
  className?: string;
  /** Announce changes to screen readers (role="status") */
  live?: boolean;
}) {
  const persona = usePersona();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role={live ? "status" : undefined}
      className={cn("flex items-center gap-2.5 rounded-[16px] py-2 pl-2.5 pr-3.5", className)}
      style={{ backgroundColor: persona.soft }}
    >
      <MascotAvatar persona={persona} size={30} />
      <p className="min-w-0 flex-1 text-meta font-medium leading-[normal]" style={{ color: persona.tint }}>
        <span className="sr-only">{persona.name}: </span>
        {children}
      </p>
    </motion.div>
  );
}
