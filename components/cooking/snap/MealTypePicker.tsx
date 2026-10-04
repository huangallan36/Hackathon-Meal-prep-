"use client";

import { motion } from "motion/react";
import { useId } from "react";
import type { MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEALS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

/** Segmented control with a sliding highlight */
export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (meal: MealType) => void }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label="Meal" className="grid grid-cols-4 gap-1 rounded-pill bg-cream-deep p-1">
      {MEALS.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.value)}
            className={cn(
              "relative h-11 rounded-pill text-[13px] font-semibold transition-colors",
              active ? "text-ink" : "text-ink-faint hover:text-ink-soft",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-meal`}
                className="absolute inset-0 rounded-pill bg-surface shadow-soft"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
