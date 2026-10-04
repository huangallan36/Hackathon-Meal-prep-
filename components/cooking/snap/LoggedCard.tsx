"use client";

import { NotebookPen, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/Misc";
import type { MealType, Nutrition } from "@/lib/types";

/** Success state after logging: animated check, what was logged, and the next hops. */
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
      className="rounded-card bg-surface p-6 text-center shadow-card"
    >
      <motion.div
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 14 }}
        className="mx-auto flex size-20 items-center justify-center rounded-full bg-herb text-white shadow-lift"
      >
        <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
          />
        </svg>
      </motion.div>

      <h2 className="mt-4 font-display text-[28px] font-semibold leading-tight text-ink">Logged to your diary</h2>
      <p className="mt-1 text-sm text-ink-soft">Nice cooking. Want to show it off?</p>

      <div className="mt-5 flex items-center gap-3 rounded-tile bg-cream p-3 text-left">
        <SmartImage src={image} alt={name} className="size-16 shrink-0 rounded-tile" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{name}</p>
          <p className="text-sm text-ink-soft">
            <span className="capitalize">{meal}</span> &middot; <span className="tabular-nums">{nutrition.calories}</span> kcal
          </p>
          <div className="mt-1 flex gap-2.5 text-[11px] font-semibold tabular-nums text-ink-soft">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-protein" />P {Math.round(nutrition.protein)}g
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-carbs" />C {Math.round(nutrition.carbs)}g
            </span>
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-fat" />F {Math.round(nutrition.fat)}g
            </span>
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
