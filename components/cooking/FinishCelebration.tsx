"use client";

import { PartyPopper, RotateCcw, Undo2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui/Button";

const COLORS = ["var(--color-accent)", "var(--color-butter)", "var(--color-flame)", "var(--color-accent-soft)", "var(--color-sky)"];

/** Deterministic pseudo-random in [0, 1) so the burst renders the same every time (pure render). */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const PIECES = Array.from({ length: 26 }, (_, i) => {
  const angle = (i / 26) * Math.PI * 2 + rand(i, 1) * 0.5;
  const dist = 70 + rand(i, 2) * 70;
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist * 0.8 - 10,
    fall: 40 + rand(i, 3) * 50,
    rotate: (rand(i, 4) - 0.5) * 540,
    delay: rand(i, 5) * 0.12,
    color: COLORS[i % COLORS.length],
    round: i % 3 === 0,
    w: 6 + Math.round(rand(i, 6) * 4),
  };
});

function ConfettiBurst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[60px] size-0" aria-hidden>
      {PIECES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            width: p.w,
            height: p.round ? p.w : p.w * 1.6,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
            marginLeft: -p.w / 2,
            marginTop: -p.w / 2,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: [0, p.x, p.x * 1.08],
            y: [0, p.y, p.y + p.fall],
            opacity: [1, 1, 0],
            scale: [0.4, 1, 0.9],
            rotate: [0, p.rotate * 0.6, p.rotate],
          }}
          transition={{ duration: 1.5, delay: 0.15 + p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

const textButton =
  "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-pill px-3 text-meta font-semibold text-ink-soft transition hover:bg-cream active:scale-95";

/**
 * "Nice work!" card after the last step, flat like the rest of the design. The main
 * action ("Snap your finished meal") is the sheet's green button right below.
 */
export function FinishCelebration({
  title,
  onBackToSteps,
  onStartOver,
}: {
  title: string;
  onBackToSteps: () => void;
  onStartOver: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="relative mx-5 overflow-hidden rounded-card bg-surface px-6 pb-4 pt-7 text-center shadow-card"
      aria-labelledby="cook-finished-title"
    >
      <ConfettiBurst />
      <motion.div
        initial={{ scale: 0.3, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }}
        className="relative mx-auto flex size-16 items-center justify-center rounded-full bg-accent"
      >
        <PartyPopper className="size-8 text-white" strokeWidth={1.8} />
      </motion.div>

      <h2 id="cook-finished-title" className="relative mt-4 font-display text-title font-semibold leading-tight text-ink">
        Nice work!
      </h2>
      <p className="relative mx-auto mt-1.5 max-w-[280px] text-sm leading-[1.4] text-ink-soft">
        <span className="font-semibold text-ink">{title}</span> is ready. Snap your finished meal and Sous will estimate the nutrition
        for your diary.
      </p>

      <ButtonLink href="/ai" variant="secondary" full className="relative mt-5">
        Skip for now
      </ButtonLink>

      <div className="relative mt-1 flex justify-center gap-1">
        <button type="button" onClick={onBackToSteps} className={textButton}>
          <Undo2 className="size-4" />
          Back to steps
        </button>
        <button type="button" onClick={onStartOver} className={textButton}>
          <RotateCcw className="size-4" />
          Cook again
        </button>
      </div>
    </motion.section>
  );
}
