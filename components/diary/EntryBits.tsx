"use client";

import { ChefHat, Sparkles } from "lucide-react";
import { SmartImage } from "@/components/ui/Misc";
import { FOOD_ICONS, foodIconKey, MEAL_TINT } from "@/lib/diary/food";
import { fmt } from "@/lib/diary/stats";
import type { DiaryEntry, Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Photo when the entry has one, otherwise a tinted food icon tile. Size via className. */
export function FoodThumb({ entry, className = "size-14" }: { entry: DiaryEntry; className?: string }) {
  if (entry.image) {
    return <SmartImage src={entry.image} alt={entry.name} className={cn("shrink-0 rounded-tile", className)} />;
  }
  const Icon = FOOD_ICONS[foodIconKey(entry.name, entry.meal)];
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-tile", MEAL_TINT[entry.meal], className)} aria-hidden>
      <Icon className="size-[46%]" strokeWidth={1.9} />
    </span>
  );
}

/** "● 42g P  ● 68g C  ● 20g F" */
export function MacroLine({ n, className }: { n: Pick<Nutrition, "protein" | "carbs" | "fat">; className?: string }) {
  const items = [
    { k: "P", v: n.protein, dot: "bg-protein" },
    { k: "C", v: n.carbs, dot: "bg-carbs" },
    { k: "F", v: n.fat, dot: "bg-fat" },
  ];
  return (
    <p className={cn("flex items-center gap-2.5 text-[11px] font-medium tabular-nums text-ink-soft", className)}>
      {items.map((it) => (
        <span key={it.k} className="inline-flex items-center gap-1">
          <span className={cn("size-1.5 rounded-full", it.dot)} aria-hidden />
          {fmt(it.v)}g <span className="text-ink-faint">{it.k}</span>
        </span>
      ))}
    </p>
  );
}

export function EstimatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill bg-butter-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color-mix(in_oklab,var(--color-butter),black_45%)]",
        className,
      )}
    >
      <Sparkles className="size-3" />
      Estimated
    </span>
  );
}

export function SousTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold text-accent", className)}>
      <ChefHat className="size-3.5" />
      via Sous
    </span>
  );
}

export function JustLoggedTag({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-pill bg-herb-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-herb", className)}>
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-herb opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-herb" />
      </span>
      Just logged
    </span>
  );
}
