"use client";

import { ChevronDown, NotebookPen, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Card";
import { FallbackNote } from "@/components/ui/Misc";
import { cleanNumberInput, draftNutrition, type EstimateDraft } from "@/lib/cooking/draft";
import { formatAmount, MICRO_KEYS, NUTRIENTS, type NutrientDef, type NutrientUnit } from "@/lib/nutrients";
import type { MealEstimate, MealType, Micros } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SPARKLE_GREEN } from "../icons";
import { ProgressRing } from "../ProgressRing";
import { MacroDonut, MacroLegend } from "./MacroDonut";
import { MealTypePicker } from "./MealTypePicker";

/** Macro chips in the design's status tints: protein green, carbs amber, fat orange, fiber blue */
const MACROS = [
  { key: "protein", label: "Protein", tint: "bg-accent-soft", ink: "text-accent", ring: "focus-within:ring-accent" },
  { key: "carbs", label: "Carbs", tint: "bg-butter-soft", ink: "text-butter-ink", ring: "focus-within:ring-butter" },
  { key: "fat", label: "Fat", tint: "bg-flame-soft", ink: "text-flame", ring: "focus-within:ring-flame" },
  { key: "fiber", label: "Fiber", tint: "bg-sky-soft", ink: "text-sky", ring: "focus-within:ring-sky" },
] as const;

const CONFIDENCE_DOT: Record<MealEstimate["confidence"], string> = {
  high: "bg-accent",
  medium: "bg-butter",
  low: "bg-flame",
};

/** Inputs hug their number (so the unit sits right after it) where field-sizing is supported */
const hug = "w-full min-w-[1ch] supports-[field-sizing:content]:w-auto supports-[field-sizing:content]:[field-sizing:content]";

/** Figma search / input field: white, 1px line; 1.5px green when focused */
const field =
  "border border-line bg-surface transition focus-within:border-accent focus-within:ring-[0.5px] focus-within:ring-accent";

/** Gemini's estimate as an editable form: every number can be corrected before logging. */
export function EstimateCard({
  draft,
  onChange,
  meal,
  onMealChange,
  source,
  confidence,
  fallbackText,
  onLog,
  logging,
  micros,
}: {
  draft: EstimateDraft;
  onChange: (patch: Partial<Omit<EstimateDraft, "anchor">>) => void;
  meal: MealType;
  onMealChange: (meal: MealType) => void;
  source: "gemini" | "fallback";
  confidence: MealEstimate["confidence"];
  fallbackText: string;
  onLog: () => void;
  logging: boolean;
  /** Vitamins, minerals and limits for the portion being logged (read-only) */
  micros?: Partial<Micros>;
}) {
  const id = useId();
  const nutrition = draftNutrition(draft);

  return (
    <section className="rounded-card bg-surface p-4 shadow-card animate-fade-up" aria-label="Nutrition estimate">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-caption font-medium leading-[normal] text-accent">
          <img src={SPARKLE_GREEN} alt="" width={12} height={12} className="block size-3" />
          Estimated
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-ink-soft">
          <span className={cn("size-2 shrink-0 rounded-full", CONFIDENCE_DOT[confidence])} />
          <span className="truncate">{source === "gemini" ? `by Gemini · ${confidence} confidence` : `${confidence} confidence`}</span>
        </span>
      </div>

      {/* Dish name: a textarea so long names wrap instead of being cut off; newlines are not allowed. */}
      <label htmlFor={`${id}-name`} className="sr-only">
        Dish name
      </label>
      <div className={cn("group mt-3 flex items-start gap-2 rounded-tile px-3.5 py-2.5", field)}>
        <textarea
          id={`${id}-name`}
          value={draft.dishName}
          maxLength={60}
          rows={Math.min(3, Math.max(1, Math.ceil(draft.dishName.length / 22)))}
          onChange={(e) => onChange({ dishName: e.target.value.replace(/[\r\n]+/g, " ") })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 resize-none bg-transparent font-display text-heading font-semibold leading-tight text-ink outline-none placeholder:text-ink-faint"
          placeholder="What did you make?"
        />
        <Pencil className="mt-1.5 size-4 shrink-0 text-ink-faint transition group-focus-within:text-accent" aria-hidden />
      </div>

      {/* Portion */}
      <label className={cn("mt-2 flex h-11 items-center gap-2.5 rounded-pill pl-4 pr-2", field)}>
        <span className="shrink-0 text-meta font-medium text-ink-soft">Portion</span>
        <input
          value={draft.portion}
          maxLength={60}
          onChange={(e) => onChange({ portion: e.target.value })}
          className="h-full min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:text-ink-faint"
          placeholder="1 plate"
        />
      </label>

      {source === "fallback" && (
        <div className="mt-3">
          <FallbackNote show>{fallbackText}</FallbackNote>
        </div>
      )}

      {/* Calories + macro split */}
      <div className="mt-4 flex items-center gap-4">
        <MacroDonut nutrition={nutrition} />
        <div className="min-w-0 flex-1">
          <label className={cn("block rounded-tile px-3 py-2", field)}>
            <span className="text-xs font-medium text-ink-soft">Calories</span>
            <span className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={draft.calories}
                onChange={(e) => onChange({ calories: cleanNumberInput(e.target.value, true) })}
                aria-label="Calories"
                className={cn(hug, "bg-transparent font-display text-[24px] font-semibold leading-tight tabular-nums text-ink outline-none")}
              />
              <span className="text-meta font-medium text-ink-soft">kcal</span>
            </span>
          </label>
          <MacroLegend nutrition={nutrition} className="mt-2.5 px-1" />
        </div>
      </div>

      {/* Macro chips (P / C / F + fiber) */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {MACROS.map((m) => (
          <label key={m.key} className={cn("block rounded-thumb px-2.5 py-2 transition focus-within:ring-[1.5px]", m.tint, m.ring)}>
            <span className={cn("block text-caption font-semibold leading-[normal]", m.ink)}>{m.label}</span>
            <span className="flex items-baseline gap-0.5">
              <input
                inputMode="decimal"
                value={draft[m.key]}
                onChange={(e) => {
                  const patch: Partial<Omit<EstimateDraft, "anchor">> = {};
                  patch[m.key] = cleanNumberInput(e.target.value);
                  onChange(patch);
                }}
                aria-label={`${m.label} in grams`}
                className={cn(hug, "bg-transparent text-lead font-semibold leading-tight tabular-nums text-ink outline-none")}
              />
              <span className={cn("text-xs font-medium", m.ink)}>g</span>
            </span>
          </label>
        ))}
      </div>

      {micros && Object.keys(micros).length > 0 && <AllNutrients micros={micros} />}

      <div className="mt-5">
        <SectionLabel className="mb-2">Log as</SectionLabel>
        <MealTypePicker value={meal} onChange={onMealChange} />
      </div>

      <Button size="lg" full className="mt-4" onClick={onLog} loading={logging} icon={<NotebookPen className="size-5" />}>
        Log to diary
      </Button>
      <p className="mt-2 text-center text-xs text-ink-faint">AI estimates can be off. Edit anything; calories follow your macros.</p>
    </section>
  );
}

const MICRO_ROWS = NUTRIENTS.filter((n) => (MICRO_KEYS as string[]).includes(n.key));

/** formatAmount, but small mg / µg amounts keep a decimal (0.4 µg of vitamin D is not "0 µg") */
function microAmount(value: number, unit: NutrientUnit): string {
  if (value > 0 && value < 10 && unit !== "g") return `${Math.round(value * 10) / 10} ${unit}`;
  return formatAmount(value, unit);
}

/** Ring color: green for goals; limits turn orange once this one plate uses 40% of the day */
function ringClass(def: NutrientDef, ratio: number): string {
  return def.kind === "limit" && ratio >= 0.4 ? "stroke-flame" : "stroke-accent";
}

/**
 * Collapsed by default: vitamins, minerals and limits for this portion (follows calorie
 * edits), as compact Figma 3.2 ring rows: the ring is this plate's share of the daily target.
 */
function AllNutrients({ micros }: { micros: Partial<Micros> }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rows = MICRO_ROWS.filter((n) => typeof micros[n.key as keyof Micros] === "number");
  return (
    <div className="mt-4 rounded-tile border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-nutrients`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-tile px-3.5 text-left text-sm font-semibold text-ink transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span>
          All nutrients <span className="font-normal text-ink-soft">· % of your day</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-soft transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={`${id}-nutrients`}
            key="list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid grid-cols-2 gap-x-3 overflow-hidden border-t border-line px-3"
          >
            {rows.map((n) => {
              const value = micros[n.key as keyof Micros] ?? 0;
              const ratio = n.target > 0 ? value / n.target : 0;
              const pct = Math.round(ratio * 100);
              return (
                <li key={n.key} className="flex min-w-0 items-center gap-2 py-2">
                  <ProgressRing progress={ratio} size={34} stroke={4} trackClassName="stroke-line" barClassName={ringClass(n, ratio)}>
                    <span className="relative text-[9px] font-bold leading-none tabular-nums text-ink">{pct}%</span>
                  </ProgressRing>
                  <span className="min-w-0 leading-[normal]">
                    <span className="block truncate text-meta font-semibold text-ink">{n.label}</span>
                    <span className="block truncate text-xs tabular-nums text-ink-soft">{microAmount(value, n.unit)}</span>
                  </span>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
