"use client";

import { SmartImage } from "@/components/ui/Misc";
import { FOOD_ICONS, foodIconKey, MEAL_TINT } from "@/lib/diary/food";
import { fmt } from "@/lib/diary/stats";
import type { DiaryEntry, Nutrition } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Photo when the entry has one, otherwise a tinted food icon tile. Size via className. */
export function FoodThumb({
  entry,
  className = "size-14",
  rounded = "rounded-tile",
}: {
  entry: DiaryEntry;
  className?: string;
  /** Radius utility (kept separate so it never fights a default) */
  rounded?: string;
}) {
  if (entry.image) {
    return <SmartImage src={entry.image} alt={entry.name} className={cn("shrink-0", rounded, className)} />;
  }
  const Icon = FOOD_ICONS[foodIconKey(entry.name, entry.meal)] ?? FOOD_ICONS.grain;
  return (
    <span className={cn("flex shrink-0 items-center justify-center", rounded, MEAL_TINT[entry.meal] ?? MEAL_TINT.snack, className)} aria-hidden>
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

/** Small Figma status pill (10px semibold) */
const badge = "inline-flex h-[18px] shrink-0 items-center gap-1 whitespace-nowrap rounded-pill px-1.5 text-micro font-semibold leading-none";

export function EstimatedBadge({ className }: { className?: string }) {
  return (
    <span className={cn(badge, "bg-butter-soft text-butter-ink", className)} title="Sous estimated these numbers">
      Estimated
    </span>
  );
}

export function SousTag({ className }: { className?: string }) {
  return <span className={cn(badge, "bg-accent-soft text-accent", className)}>via Sous</span>;
}

export function JustLoggedTag({ className }: { className?: string }) {
  return (
    <span className={cn(badge, "bg-flame-soft text-flame", className)}>
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-flame opacity-60" />
        <span className="relative inline-flex size-1.5 rounded-full bg-flame" />
      </span>
      Just logged
    </span>
  );
}
