"use client";

import { Camera, RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { SmartImage } from "@/components/ui/Misc";
import type { Recipe } from "@/lib/types";

/** Which recipe this photo is for, with a way to log something else instead */
export function CookedRecipeCard({ recipe, onClear }: { recipe: Pick<Recipe, "title" | "image">; onClear: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card animate-fade-up">
      <SmartImage src={recipe.image} alt="" className="size-14 shrink-0 rounded-tile" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">You just cooked</p>
        <p className="truncate font-semibold text-ink">{recipe.title}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill px-3 text-sm font-semibold text-accent transition hover:bg-accent-soft active:scale-95"
      >
        <RefreshCw className="size-3.5" />
        Other meal
      </button>
    </div>
  );
}

/** Empty "viewfinder" shown before a photo is picked */
export function SnapViewfinder() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-card border-2 border-dashed border-line bg-surface/70 px-8 text-center animate-fade-up [animation-delay:60ms]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,var(--color-accent-soft),transparent_65%)]" />
      <motion.div
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-accent"
      >
        <Camera className="size-7" />
      </motion.div>
      <p className="relative mt-2 font-display text-[22px] font-semibold text-ink">Snap your plate</p>
      <p className="relative max-w-[250px] text-sm leading-relaxed text-ink-soft">
        Gemini estimates calories, protein, carbs, fat and fiber. You can tweak every number.
      </p>
    </div>
  );
}

/** The chosen photo above the estimate, with a retake button */
export function MealPhoto({ src, onRetake }: { src: string; onRetake: () => void }) {
  return (
    <div className="relative h-[210px] w-full overflow-hidden rounded-card bg-cream-deep shadow-card animate-pop">
      <SmartImage src={src} alt="Your meal" className="size-full" />
      <button
        type="button"
        onClick={onRetake}
        className="absolute right-3 top-3 inline-flex h-11 items-center gap-1.5 rounded-pill bg-ink/65 px-4 text-sm font-semibold text-white backdrop-blur transition hover:bg-ink/80 active:scale-95"
      >
        <Camera className="size-4" />
        Retake
      </button>
    </div>
  );
}
