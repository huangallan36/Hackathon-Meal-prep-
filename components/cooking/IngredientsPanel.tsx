"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { SectionLabel } from "@/components/ui/Card";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { availabilityOf, IngredientList } from "./IngredientList";

/** Inline, collapsible ingredient list for step mode (inline so it never covers the video). */
export function IngredientsPanel({ recipe, open }: { recipe: Recipe; open: boolean }) {
  const fridge = useKitchen((s) => s.ingredients);
  const availability = useMemo(() => availabilityOf(recipe.ingredients, fridge), [recipe.ingredients, fridge]);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          key="ingredients"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="-mx-1 overflow-hidden px-1"
        >
          <div className="mb-1 rounded-card border border-line bg-surface/80 px-4 pb-2 pt-3.5">
            <SectionLabel>Ingredients &middot; serves {recipe.servings}</SectionLabel>
            <IngredientList ingredients={recipe.ingredients} availability={availability} compact />
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
