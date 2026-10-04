"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useState } from "react";
import { stepTimers } from "@/lib/cooking/durations";
import { ingredientsInStep } from "@/lib/cooking/stepIngredients";
import type { Recipe } from "@/lib/types";
import { TimerChips } from "./TimerChips";

const variants: Variants = {
  enter: (dir: number) => ({ x: dir * 56, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir * -56, opacity: 0, scale: 0.98 }),
};

/**
 * One big card per step with a direction-aware slide between steps. Renders purely from
 * `index`, so voice commands that move the store animate exactly like taps.
 */
export function StepCard({ recipe, index, pulse = 0 }: { recipe: Recipe; index: number; pulse?: number }) {
  const reduce = useReducedMotion();
  // Derive slide direction from the previous index (React's "adjust state on prop change" pattern).
  const [prevIndex, setPrevIndex] = useState(index);
  const [dir, setDir] = useState(1);
  if (prevIndex !== index) {
    setDir(index > prevIndex ? 1 : -1);
    setPrevIndex(index);
  }

  const step = recipe.steps[index];
  if (!step) return null;
  const timers = stepTimers(step);
  const used = ingredientsInStep(step.text, recipe.ingredients);

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.article
          key={index}
          custom={dir}
          variants={reduce ? undefined : variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 380, damping: 36, opacity: { duration: 0.18 } }}
          className="min-h-[248px] rounded-card bg-surface p-6 shadow-card"
          aria-live="polite"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow-accent">
              {index + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {index === recipe.steps.length - 1
                ? "Last step"
                : `${recipe.steps.length - index - 1} more to go`}
            </span>
          </div>

          <motion.p
            key={pulse}
            initial={pulse ? { opacity: 0.35 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-4 text-pretty font-display text-[25px] font-medium leading-relaxed text-ink"
          >
            {step.text}
          </motion.p>

          {used.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">You&apos;ll need</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {used.map((ing) => (
                  <li key={ing.original} className="rounded-pill bg-cream-deep px-3 py-1.5 text-sm font-medium text-ink-soft">
                    {ing.original}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <TimerChips timers={timers} className="mt-5" />
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
