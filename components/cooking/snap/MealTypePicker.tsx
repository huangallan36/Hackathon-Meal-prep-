"use client";

import { motion } from "motion/react";
import { useId, type KeyboardEvent } from "react";
import type { MealType } from "@/lib/types";
import { cn } from "@/lib/utils";

const MEALS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

/**
 * Segmented control in the Figma 2.4 "Need · Have" style: cream-deep track with 4px
 * padding, a sliding white segment, 13px SemiBold labels (ink when on, ink-soft when off).
 */
export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (meal: MealType) => void }) {
  const id = useId();

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const at = MEALS.findIndex((m) => m.value === value);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const next = MEALS[(at + step + MEALS.length) % MEALS.length];
    onChange(next.value);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-meal="${next.value}"]`)?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Meal" onKeyDown={onKeyDown} className="flex w-full rounded-pill bg-cream-deep p-1">
      {MEALS.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            data-meal={m.value}
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(m.value)}
            className={cn(
              "relative flex flex-1 justify-center rounded-pill py-2 text-meta font-semibold leading-[normal] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "text-ink" : "text-ink-soft hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-meal`}
                className="absolute inset-0 rounded-pill bg-surface"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
