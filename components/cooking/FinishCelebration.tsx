"use client";

import { Camera, PartyPopper, RotateCcw, Undo2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button, ButtonLink } from "@/components/ui/Button";

const COLORS = ["var(--color-accent)", "var(--color-butter)", "var(--color-herb)", "var(--color-fat)", "var(--color-protein)", "var(--color-carbs)"];

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
    <div className="pointer-events-none absolute left-1/2 top-[76px] size-0" aria-hidden>
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
            rotate: p.rotate,
          }}
          transition={{ duration: 1.5, delay: 0.15 + p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

/** "Nice work!" card shown after the last step */
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
      className="relative overflow-hidden rounded-card bg-surface px-6 pb-6 pt-8 text-center shadow-card"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,var(--color-accent-soft),transparent_70%)]" />
      <ConfettiBurst />
      <motion.div
        initial={{ scale: 0.3, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }}
        className="relative mx-auto flex size-[88px] items-center justify-center rounded-full bg-accent text-white shadow-accent"
      >
        <PartyPopper className="size-10" strokeWidth={1.8} />
      </motion.div>

      <h2 className="relative mt-5 font-display text-[32px] font-semibold leading-tight text-ink">Nice work!</h2>
      <p className="relative mx-auto mt-2 max-w-[280px] text-[15px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">{title}</span> is ready. Snap your finished meal and Sous will estimate the nutrition
        for your diary.
      </p>

      <div className="relative mt-6 flex flex-col gap-2.5">
        <ButtonLink href="/ai/snap" size="lg" full icon={<Camera className="size-5" />}>
          Snap your finished meal
        </ButtonLink>
        <ButtonLink href="/ai" variant="secondary" size="md" full>
          Skip
        </ButtonLink>
      </div>

      <div className="relative mt-3 flex justify-center gap-1">
        <Button variant="ghost" onClick={onBackToSteps} icon={<Undo2 className="size-4" />}>
          Back to steps
        </Button>
        <Button variant="ghost" onClick={onStartOver} icon={<RotateCcw className="size-4" />}>
          Cook again
        </Button>
      </div>
    </motion.section>
  );
}
