"use client";

import { motion } from "motion/react";

const INK = "var(--color-ink)";
const STROKE = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Friendly open-fridge illustration for the empty fridge-scan step. Pure SVG, theme colors only. */
export function FridgeHero({ className }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 260 210"
      fill="none"
      role="img"
      aria-label="An open fridge full of food"
      className={className}
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      <ellipse cx="132" cy="198" rx="84" ry="7" fill={INK} opacity={0.08} />
      <circle cx="130" cy="102" r="92" fill="var(--color-accent-soft)" />

      {/* Fridge body + cavity */}
      <rect x="58" y="20" width="112" height="172" rx="20" fill="var(--color-surface)" {...STROKE} />
      <rect x="70" y="32" width="88" height="148" rx="12" fill="var(--color-butter-soft)" />
      <path d="M70 82h88M70 132h88" stroke="var(--color-line)" strokeWidth={4} strokeLinecap="round" />

      {/* Top shelf: milk + eggs */}
      <rect x="80" y="46" width="18" height="33" rx="5" fill="var(--color-surface)" {...STROKE} strokeWidth={2.5} />
      <rect x="83" y="39" width="12" height="8" rx="2" fill="var(--color-fat)" {...STROKE} strokeWidth={2.5} />
      <ellipse cx="114" cy="70" rx="7" ry="9" fill="var(--color-surface)" {...STROKE} strokeWidth={2.5} />
      <ellipse cx="129" cy="70" rx="7" ry="9" fill="var(--color-surface)" {...STROKE} strokeWidth={2.5} />
      <ellipse cx="144" cy="70" rx="7" ry="9" fill="var(--color-surface)" {...STROKE} strokeWidth={2.5} />

      {/* Middle shelf: tomato + cheese */}
      <circle cx="90" cy="117" r="12" fill="var(--color-accent)" {...STROKE} strokeWidth={2.5} />
      <path d="M85 105c3 3 7 3 10 0" stroke="var(--color-herb)" strokeWidth={3} strokeLinecap="round" />
      <path d="M110 129h40v-22z" fill="var(--color-butter)" {...STROKE} strokeWidth={2.5} />
      <circle cx="137" cy="122" r="2.5" fill="var(--color-butter-soft)" />
      <circle cx="144" cy="116" r="1.8" fill="var(--color-butter-soft)" />

      {/* Bottom shelf: carrot + greens */}
      <path d="M82 172l20-27 8 6z" fill="var(--color-protein)" {...STROKE} strokeWidth={2.5} />
      <path d="M104 144l5-7M108 147l7-4" stroke="var(--color-herb)" strokeWidth={3} strokeLinecap="round" />
      <circle cx="136" cy="163" r="13" fill="var(--color-herb)" {...STROKE} strokeWidth={2.5} />
      <path d="M130 160c4 4 8 4 12 0M133 167c3 2 5 2 7 0" stroke="var(--color-herb-soft)" strokeWidth={2} strokeLinecap="round" />

      {/* Open door */}
      <path d="M170 24l42 15v140l-42 13z" fill="var(--color-surface)" {...STROKE} />
      <path d="M178 72l26 6M178 126l26 2" stroke="var(--color-line)" strokeWidth={4} strokeLinecap="round" />
      <rect x="179" y="56" width="9" height="15" rx="3" fill="var(--color-carbs)" {...STROKE} strokeWidth={2} />
      <rect x="192" y="58" width="8" height="16" rx="3" fill="var(--color-fiber)" {...STROKE} strokeWidth={2} />
      <rect x="198" y="96" width="5" height="22" rx="2.5" fill={INK} />

      {/* Sparkles */}
      <Sparkle x={34} y={52} size={1} delay={0} />
      <Sparkle x={226} y={14} size={0.7} delay={0.8} />
      <Sparkle x={222} y={168} size={0.55} delay={1.6} />
    </motion.svg>
  );
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <motion.path
        d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z"
        fill="var(--color-butter)"
        animate={{ scale: [1, 0.6, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, delay, ease: "easeInOut" }}
      />
    </g>
  );
}
