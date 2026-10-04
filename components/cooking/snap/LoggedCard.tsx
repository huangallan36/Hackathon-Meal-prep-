"use client";

import { NotebookPen, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { SousAvatar } from "@/components/kitchen/SousLine";
import { Button } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/Misc";
import type { MealType, Nutrition } from "@/lib/types";

/** Macro chips like the diary's "P 146g · C 228g · F 68g" (protein avocado, carbs lemon, fat tomato) */
const CHIPS = [
  { key: "protein", letter: "P", tint: "bg-accent-soft text-accent" },
  { key: "carbs", letter: "C", tint: "bg-butter-soft text-butter-ink" },
  { key: "fat", letter: "F", tint: "bg-flame-soft text-flame" },
] as const;

/**
 * Success state after logging: the chosen voice's mascot with an animated avocado check
 * (a small celebration, design rules v1), what was logged (a "Similar"-style row with the
 * photo at radius 14), and the next hops.
 */
export function LoggedCard({
  name,
  image,
  meal,
  nutrition,
  onShare,
  onViewDiary,
}: {
  name: string;
  image?: string;
  meal: MealType;
  nutrition: Nutrition;
  onShare: () => void;
  onViewDiary: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="rounded-card bg-surface p-5 text-center shadow-card"
      aria-labelledby="snap-logged-title"
    >
      <motion.div
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="relative mx-auto flex w-fit"
      >
        <SousAvatar size={64} />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.15 }}
          className="absolute -bottom-0.5 -right-1 flex size-6 items-center justify-center rounded-full bg-accent text-white ring-2 ring-surface"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
            />
          </svg>
        </motion.span>
      </motion.div>

      <h2 id="snap-logged-title" className="mt-4 font-display text-heading font-semibold leading-tight text-ink">
        Logged to your diary
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Nice cooking. Want to show it off?</p>

      <div className="mt-4 flex items-center gap-3 rounded-tile border border-line bg-surface py-2 pl-2 pr-3 text-left">
        <SmartImage src={image} alt={name} className="size-[60px] shrink-0 rounded-thumb" />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[normal]">
          <p className="truncate text-body font-semibold text-ink">{name}</p>
          <p className="truncate text-xs text-ink-soft">
            <span className="capitalize">{meal}</span> · <span className="tabular-nums">{nutrition.calories}</span> kcal
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {CHIPS.map((c) => (
              <span key={c.key} className={`rounded-pill px-2 py-0.5 text-caption font-semibold tabular-nums ${c.tint}`}>
                {c.letter} {Math.round(nutrition[c.key])}g
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2.5">
        <Button size="lg" full onClick={onShare} icon={<Share2 className="size-5" />}>
          Share to Social
        </Button>
        <Button variant="secondary" full onClick={onViewDiary} icon={<NotebookPen className="size-5" />}>
          View diary
        </Button>
      </div>
    </motion.section>
  );
}
