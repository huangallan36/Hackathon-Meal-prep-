"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Primary action pinned just above the bottom nav. It stops short of the right edge
 * so it never covers the floating orb (bottom-right), and a cream fade keeps
 * scrolled content from clashing with the button. Pair with `pb-nav` on the screen.
 */
export function StickyAction({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="pointer-events-none fixed bottom-[calc(var(--nav-height)+var(--safe-bottom))] left-0 right-[84px] z-30 bg-gradient-to-t from-cream from-60% to-transparent pb-3 pl-5 pr-2 pt-8"
    >
      <div className="pointer-events-auto">{children}</div>
    </motion.div>
  );
}
