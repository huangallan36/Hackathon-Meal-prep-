"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { SectionHeader } from "@/components/ui/Card";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { availabilityOf, IngredientList } from "./IngredientList";

/** Inline, collapsible ingredient card for step mode (opened from the header's "more" menu) */
export function IngredientsPanel({ recipe, open, onClose }: { recipe: Recipe; open: boolean; onClose: () => void }) {
  const fridge = useKitchen((s) => s.ingredients);
  const availability = useMemo(() => availabilityOf(recipe.ingredients, fridge), [recipe.ingredients, fridge]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          id="cook-ingredients"
          key="ingredients"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden px-5"
          aria-label="Ingredients"
        >
          <div className="mt-4 rounded-card bg-surface px-4 pb-1.5 pt-3.5 shadow-card">
            <SectionHeader
              title={`Ingredients · serves ${recipe.servings}`}
              action={
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-2 inline-flex h-11 items-center rounded-pill px-2 text-meta font-semibold text-accent"
                >
                  Hide
                </button>
              }
              className="-my-2"
            />
            <IngredientList ingredients={recipe.ingredients} availability={availability} compact />
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
