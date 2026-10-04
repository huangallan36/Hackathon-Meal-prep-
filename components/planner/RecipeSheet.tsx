"use client";

import { CalendarPlus, Check, ChefHat, Clock, Flame, ListOrdered, ShoppingBasket, Users, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/Misc";
import { minutesLabel } from "@/lib/kitchen/format";
import { cookRecipe } from "@/lib/planner/client";
import { dayPhrase } from "@/lib/planner/format";
import { useWeekPlan, type PlanDay } from "@/lib/planner/hooks";
import { usePlanner } from "@/lib/planner/store";
import { ingredientMatches, isPantry } from "@/lib/recipes/catalog";
import { useKitchen } from "@/lib/stores/kitchen";
import type { ISODate, Recipe } from "@/lib/types";
import { cn, formatCount, formatDay } from "@/lib/utils";
import { RecipeEyebrow } from "./RecipeMeta";

const MAX_INGREDIENT_CHIPS = 10;

/**
 * Recipe detail sheet: photo, summary, quick stats, ingredients (fridge items in green),
 * plan-a-day pills, and the Groceries / Cook this actions. Sits above the bottom nav and
 * the floating orb; closes on backdrop tap, the X, Escape, or dragging the handle down.
 */
export function RecipeSheet({
  recipe,
  upvotes = 0,
  planTarget,
  onPlanned,
  onClose,
}: {
  /** null = closed */
  recipe: Recipe | null;
  upvotes?: number;
  /** A day the user tapped in "This week" and is picking a recipe for */
  planTarget: ISODate | null;
  onPlanned: (date: ISODate, added: boolean, recipe: Recipe) => void;
  onClose: () => void;
}) {
  const controls = useDragControls();
  const open = recipe != null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // While open: the page behind stops scrolling, and focus returns to the tapped card on close.
  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scroller = document.getElementById("sous-scroll");
    const overflow = scroller?.style.overflowY ?? "";
    if (scroller) scroller.style.overflowY = "hidden";
    return () => {
      if (scroller) scroller.style.overflowY = overflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [open]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  }

  return (
    <AnimatePresence>
      {recipe && (
        <motion.div
          key="planner-backdrop"
          aria-hidden
          className="fixed inset-0 z-[55] touch-none bg-ink/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}
      {recipe && (
        <motion.div
          key="planner-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planner-sheet-title"
          className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[92%] flex-col rounded-t-[28px] bg-surface shadow-lift"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          drag="y"
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
            onPointerDown={(e) => controls.start(e)}
          >
            <span className="h-1.5 w-11 rounded-full bg-line" />
          </div>
          <SheetBody
            key={recipe.id}
            recipe={recipe}
            upvotes={upvotes}
            planTarget={planTarget}
            onPlanned={onPlanned}
            onClose={onClose}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetBody({
  recipe,
  upvotes,
  planTarget,
  onPlanned,
  onClose,
}: {
  recipe: Recipe;
  upvotes: number;
  planTarget: ISODate | null;
  onPlanned: (date: ISODate, added: boolean, recipe: Recipe) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const fridge = useKitchen((s) => s.ingredients);

  const ingredients = recipe.ingredients.filter((i) => !isPantry(i.name));
  const has = (name: string) => fridge.some((f) => ingredientMatches(f, name));
  const haveCount = ingredients.filter((i) => has(i.name)).length;
  // Fridge items first, so the green chips read as "you're most of the way there".
  const shown = [...ingredients].sort((a, b) => Number(has(b.name)) - Number(has(a.name))).slice(0, MAX_INGREDIENT_CHIPS);
  const more = ingredients.length - shown.length;

  async function handleCook() {
    if (busy) return;
    setBusy(true);
    const ok = await cookRecipe(recipe, (href) => router.push(href));
    // On success the page navigates away; keep the spinner until it does.
    if (!ok) setBusy(false);
  }

  return (
    <>
      <div className="no-scrollbar min-h-0 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="relative overflow-hidden rounded-card bg-cream-deep shadow-card">
          <SmartImage src={recipe.image} alt={recipe.title} className="aspect-[16/11] w-full" />
          {upvotes > 0 && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-surface/92 px-2.5 py-1 text-xs font-semibold tabular-nums text-ink shadow-soft backdrop-blur">
              <Flame className="size-3.5 text-accent" fill="currentColor" strokeWidth={2.2} />
              {formatCount(upvotes)} yums
            </span>
          )}
          <IconButton label="Close" onClick={onClose} autoFocus className="absolute right-3 top-3 size-11 bg-surface/90 backdrop-blur">
            <X className="size-5" />
          </IconButton>
        </div>

        <RecipeEyebrow recipe={recipe} max={3} className="mt-4" />
        <h2 id="planner-sheet-title" className="mt-1 text-balance font-display text-[26px] font-semibold leading-tight text-ink">
          {recipe.title}
        </h2>
        {recipe.sourceName && <p className="mt-1 truncate text-sm text-ink-faint">by {recipe.sourceName}</p>}

        <div className="mt-4 grid grid-cols-4 rounded-tile bg-cream py-3">
          <Stat icon={<Clock className="size-4" />} value={minutesLabel(recipe.readyInMinutes)} label="Time" />
          <Stat icon={<Users className="size-4" />} value={String(recipe.servings)} label="Servings" />
          <Stat icon={<ShoppingBasket className="size-4" />} value={String(ingredients.length)} label="Ingredients" />
          <Stat icon={<ListOrdered className="size-4" />} value={String(recipe.steps.length)} label="Steps" />
        </div>

        {recipe.summary && <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{recipe.summary}</p>}
        {recipe.nutrition?.calories ? (
          <p className="mt-2 text-sm text-ink-soft">
            About <span className="font-semibold text-ink">{Math.round(recipe.nutrition.calories)} kcal</span> and{" "}
            <span className="font-semibold text-ink">{Math.round(recipe.nutrition.protein)} g protein</span> per serving
          </p>
        ) : null}

        {ingredients.length > 0 && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-display text-lg font-semibold text-ink">What you&apos;ll need</h3>
              {haveCount > 0 && <span className="shrink-0 text-xs font-semibold text-herb">{haveCount} in your fridge</span>}
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {shown.map((ing) => {
                const mine = has(ing.name);
                return (
                  <li
                    key={`${ing.name}|${ing.original}`}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 rounded-pill px-3 py-1.5 text-sm font-medium",
                      mine ? "bg-herb-soft text-herb" : "bg-cream text-ink-soft ring-1 ring-line",
                    )}
                  >
                    {mine && <Check className="size-3.5 shrink-0" />}
                    <span className="truncate">{ing.name}</span>
                  </li>
                );
              })}
              {more > 0 && <li className="rounded-pill px-2 py-1.5 text-sm font-medium text-ink-faint">+{more} more</li>}
            </ul>
          </section>
        )}

        <PlanPicker recipe={recipe} planTarget={planTarget} onPlanned={onPlanned} />
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-5 pb-[calc(var(--safe-bottom)+16px)] pt-3">
        <div className="flex gap-3">
          <ButtonLink
            href={`/ai/groceries/${recipe.id}`}
            variant="secondary"
            className="flex-1"
            icon={<ShoppingBasket className="size-4" />}
          >
            Groceries
          </ButtonLink>
          <Button className="flex-[1.4]" loading={busy} icon={<ChefHat className="size-4" />} onClick={() => void handleCook()}>
            Cook this
          </Button>
        </div>
      </div>
    </>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 border-l border-line px-1 text-center first:border-l-0">
      <span className="text-accent">{icon}</span>
      <span className="truncate text-[15px] font-semibold text-ink">{value}</span>
      <span className="text-[11px] font-medium text-ink-faint">{label}</span>
    </div>
  );
}

/** Seven day pills. Tapping toggles this recipe on that day. */
function PlanPicker({
  recipe,
  planTarget,
  onPlanned,
}: {
  recipe: Recipe;
  planTarget: ISODate | null;
  onPlanned: (date: ISODate, added: boolean, recipe: Recipe) => void;
}) {
  const days = useWeekPlan();
  const togglePlanned = usePlanner((s) => s.togglePlanned);
  const plannedDays = days.filter((d) => d.meals.some((m) => m.recipeId === recipe.id));
  const target = planTarget ? days.find((d) => d.date === planTarget) : undefined;
  const targetPlanned = target?.meals.some((m) => m.recipeId === recipe.id);

  function toggle(day: PlanDay) {
    onPlanned(day.date, togglePlanned(day.date, recipe), recipe);
  }

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-ink">Plan it</h3>
        <span className="truncate text-xs font-medium text-ink-faint">
          {plannedDays.length
            ? `On your plan: ${plannedDays.map((d) => d.label).join(", ")}`
            : "Pick a day this week"}
        </span>
      </div>

      {target && !targetPlanned && (
        <Button
          variant="soft"
          full
          className="mt-3"
          icon={<CalendarPlus className="size-4" />}
          onClick={() => toggle(target)}
        >
          Plan for {dayPhrase(target.date)}
        </Button>
      )}

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const on = day.meals.some((m) => m.recipeId === recipe.id);
          return (
            <button
              key={day.date}
              type="button"
              aria-pressed={on}
              aria-label={`${formatDay(day.date, { weekday: "long", month: "short", day: "numeric" })}${on ? ", planned" : ""}`}
              onClick={() => toggle(day)}
              className={cn(
                "flex h-14 min-w-0 flex-col items-center justify-center rounded-tile text-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                on ? "bg-ink text-white shadow-soft" : "bg-cream text-ink ring-1 ring-line hover:bg-cream-deep",
                planTarget === day.date && !on && "ring-2 ring-accent",
              )}
            >
              <span className={cn("text-[10px] font-semibold uppercase tracking-[0.06em]", on ? "text-white/70" : "text-ink-faint")}>
                {day.label}
              </span>
              <span className="text-[15px] font-semibold leading-tight">{on ? <Check className="mx-auto size-4" /> : day.dayOfMonth}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
