"use client";

import { ChevronDown, NotebookPen, Pencil, Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FallbackNote } from "@/components/ui/Misc";
import { cleanNumberInput, draftNutrition, type EstimateDraft } from "@/lib/cooking/draft";
import { formatAmount, MICRO_KEYS, NUTRIENTS, type NutrientUnit } from "@/lib/nutrients";
import type { MealEstimate, MealType, Micros } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MacroDonut, MacroLegend } from "./MacroDonut";
import { MealTypePicker } from "./MealTypePicker";

const MACROS = [
  { key: "protein", label: "Protein", dot: "bg-protein" },
  { key: "carbs", label: "Carbs", dot: "bg-carbs" },
  { key: "fat", label: "Fat", dot: "bg-fat" },
  { key: "fiber", label: "Fiber", dot: "bg-fiber" },
] as const;

const CONFIDENCE_DOT: Record<MealEstimate["confidence"], string> = {
  high: "bg-herb",
  medium: "bg-butter",
  low: "bg-accent",
};

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
    <section className="rounded-card bg-surface p-5 shadow-card animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-accent-strong">
          <Sparkles className="size-3.5" />
          Estimated
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
          <span className={cn("size-2 rounded-full", CONFIDENCE_DOT[confidence])} />
          {source === "gemini" ? `by Gemini · ${confidence} confidence` : `${confidence} confidence`}
        </span>
      </div>

      {/* Dish name */}
      <label htmlFor={`${id}-name`} className="sr-only">
        Dish name
      </label>
      <div className="group mt-3 flex items-start gap-2 border-b border-transparent pb-1 focus-within:border-accent">
        {/* A textarea so long dish names wrap instead of being cut off; newlines are not allowed. */}
        <textarea
          id={`${id}-name`}
          value={draft.dishName}
          maxLength={60}
          rows={Math.min(3, Math.max(1, Math.ceil(draft.dishName.length / 20)))}
          onChange={(e) => onChange({ dishName: e.target.value.replace(/[\r\n]+/g, " ") })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          className="min-w-0 flex-1 resize-none bg-transparent font-display text-[24px] font-semibold leading-tight text-ink outline-none placeholder:text-ink-faint"
          placeholder="What did you make?"
        />
        <Pencil className="mt-2 size-4 shrink-0 text-ink-faint transition group-focus-within:text-accent" aria-hidden />
      </div>

      {/* Portion */}
      <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
        <span className="shrink-0 font-medium">Portion</span>
        <input
          value={draft.portion}
          maxLength={60}
          onChange={(e) => onChange({ portion: e.target.value })}
          className="h-11 min-w-0 flex-1 rounded-tile border border-line bg-cream/60 px-3 text-base text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          placeholder="1 plate"
        />
      </label>

      {source === "fallback" && (
        <div className="mt-3">
          <FallbackNote show>{fallbackText}</FallbackNote>
        </div>
      )}

      {/* Calories + macro split */}
      <div className="mt-5 flex items-center gap-4">
        <MacroDonut nutrition={nutrition} />
        <div className="min-w-0 flex-1">
          <label className="block rounded-tile border border-line bg-cream/60 px-3 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <span className="text-xs font-semibold text-ink-soft">Calories</span>
            <span className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={draft.calories}
                onChange={(e) => onChange({ calories: cleanNumberInput(e.target.value, true) })}
                aria-label="Calories"
                className="w-full min-w-0 bg-transparent font-display text-[26px] font-semibold tabular-nums text-ink outline-none"
              />
              <span className="text-sm font-medium text-ink-faint">kcal</span>
            </span>
          </label>
          <MacroLegend nutrition={nutrition} className="mt-3" />
        </div>
      </div>

      {/* Macros */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {MACROS.map((m) => (
          <label
            key={m.key}
            className="block rounded-tile border border-line bg-cream/60 px-3 py-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <span className={cn("size-2.5 rounded-full", m.dot)} />
              {m.label}
            </span>
            <span className="flex items-baseline gap-1">
              <input
                inputMode="decimal"
                value={draft[m.key]}
                onChange={(e) => {
                  const patch: Partial<Omit<EstimateDraft, "anchor">> = {};
                  patch[m.key] = cleanNumberInput(e.target.value);
                  onChange(patch);
                }}
                aria-label={`${m.label} in grams`}
                className="w-full min-w-0 bg-transparent text-[20px] font-semibold tabular-nums text-ink outline-none"
              />
              <span className="text-sm font-medium text-ink-faint">g</span>
            </span>
          </label>
        ))}
      </div>

      {micros && Object.keys(micros).length > 0 && <AllNutrients micros={micros} />}

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Log as</p>
        <MealTypePicker value={meal} onChange={onMealChange} />
      </div>

      <Button size="lg" full className="mt-5" onClick={onLog} loading={logging} icon={<NotebookPen className="size-5" />}>
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

/** Collapsed by default: vitamins, minerals and limits for this portion (follows calorie edits) */
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
        className="flex h-11 w-full items-center justify-between gap-2 rounded-tile px-3 text-left text-sm font-semibold text-ink transition hover:bg-cream/60"
      >
        <span>
          All nutrients <span className="font-medium text-ink-faint">(estimated)</span>
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-faint transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul id={`${id}-nutrients`} className="grid animate-fade-up grid-cols-2 gap-x-4 border-t border-line px-3 py-1.5">
          {rows.map((n) => (
            <li key={n.key} className="flex min-w-0 items-baseline justify-between gap-2 py-1.5 text-[13px]">
              <span className="truncate text-ink-soft">{n.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{microAmount(micros[n.key as keyof Micros] ?? 0, n.unit)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
