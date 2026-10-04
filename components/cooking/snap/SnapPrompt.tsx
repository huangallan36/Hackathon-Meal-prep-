"use client";

import { Camera, Undo2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Plate } from "@/components/planner/Plate";
import { SmartImage } from "@/components/ui/Misc";
import type { Recipe } from "@/lib/types";

/**
 * Which recipe this photo is for, as a Figma 2.2 "Similar" row (60px plate thumb, 15px
 * title, 12px meta), with a way to log something else instead.
 */
export function CookedRecipeCard({
  recipe,
  onClear,
}: {
  recipe: Pick<Recipe, "id" | "title" | "image" | "readyInMinutes" | "nutrition">;
  onClear: () => void;
}) {
  const meta = ["Just cooked"];
  if (recipe.nutrition?.calories) meta.push(`${Math.round(recipe.nutrition.calories)} kcal`);
  else meta.push(`${recipe.readyInMinutes} min`);
  return (
    <div className="flex w-full items-center gap-3 rounded-tile border border-line bg-surface py-2 pl-2 pr-1.5 animate-fade-up">
      <Plate slot="thumb" index={recipe.id} size={60} shape="thumb" src={recipe.image} />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[normal]">
        <p className="line-clamp-2 text-body font-semibold leading-tight text-ink">{recipe.title}</p>
        <p className="truncate text-xs text-ink-soft">{meta.join(" · ")}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-10 shrink-0 items-center rounded-pill px-2.5 text-meta font-semibold text-accent transition hover:bg-accent-soft active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Other meal
      </button>
    </div>
  );
}

/** After "Other meal": a way back to logging the recipe that was just cooked */
export function BackToCooked({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-tile border border-line bg-surface px-3.5 py-2.5 text-left text-meta text-ink-soft transition hover:bg-cream active:scale-[0.99] animate-fade-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Undo2 className="size-4 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate">
        Log <span className="font-semibold text-ink">{title}</span> instead
      </span>
    </button>
  );
}

/** Empty photo card (radius 22) shown before a photo is picked */
export function SnapViewfinder() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-card border-[1.5px] border-dashed border-line-strong bg-surface px-8 text-center animate-fade-up [animation-delay:60ms]">
      <motion.div
        animate={reduce ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent"
      >
        <Camera className="size-6" />
      </motion.div>
      <p className="mt-2 font-display text-heading font-semibold leading-tight text-ink">Snap your plate</p>
      <p className="max-w-[250px] text-sm leading-[1.4] text-ink-soft">
        Gemini estimates calories, macros, vitamins and minerals. You can tweak every number.
      </p>
    </div>
  );
}

/** The chosen photo above the estimate, with a retake button */
export function MealPhoto({ src, onRetake }: { src: string; onRetake: () => void }) {
  return (
    <div className="relative h-[210px] w-full overflow-hidden rounded-card bg-cream-deep animate-pop">
      <SmartImage src={src} alt="Your meal" className="size-full" />
      <button
        type="button"
        onClick={onRetake}
        className="absolute right-3 top-3 inline-flex h-[34px] items-center gap-1.5 rounded-pill bg-surface/95 px-3.5 text-meta font-semibold text-ink backdrop-blur transition after:absolute after:-inset-1.5 after:content-[''] hover:bg-surface active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Camera className="size-4" />
        Retake
      </button>
    </div>
  );
}
