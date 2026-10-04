"use client";

import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SmartImage } from "@/components/ui/Misc";
import { capitalize } from "@/lib/kitchen/format";
import { groceryKey } from "@/lib/kitchen/groceries";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Big tappable shopping checklist; ticks persist in useKitchen.groceryChecked. */
export function GroceryChecklist({ recipeId, items }: { recipeId: number; items: Ingredient[] }) {
  const checked = useKitchen((s) => s.groceryChecked);
  const toggle = useKitchen((s) => s.toggleGrocery);
  const done = items.filter((i) => checked[groceryKey(recipeId, i.name)]).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-soft" aria-live="polite">
          <span className="text-ink">{done}</span> of {items.length} in the cart
        </p>
        <span className="text-xs font-semibold text-herb">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-cream-deep">
        <motion.div
          className="h-full rounded-pill bg-herb"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        />
      </div>

      <ul className="overflow-hidden rounded-card bg-surface shadow-card">
        {items.map((item, i) => {
          const key = groceryKey(recipeId, item.name);
          const on = Boolean(checked[key]);
          return (
            <motion.li
              key={key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
              className={cn(i > 0 && "border-t border-line")}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(key)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition active:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-[10px] border-2 transition-colors duration-200",
                    on ? "border-herb bg-herb text-white" : "border-line bg-surface",
                  )}
                >
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                        className="inline-flex"
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <SmartImage
                  src={item.image}
                  alt=""
                  className={cn("size-10 shrink-0 rounded-[12px] transition-opacity", on && "opacity-50")}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[15px] font-semibold transition-colors",
                      on ? "text-ink-faint line-through" : "text-ink",
                    )}
                  >
                    {capitalize(item.name)}
                  </span>
                  {item.original && item.original.toLowerCase() !== item.name && (
                    <span className="block truncate text-[13px] text-ink-soft">{item.original}</span>
                  )}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence>
        {items.length > 0 && done === items.length && (
          <motion.p
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-tile bg-herb-soft px-4 py-3 text-sm font-semibold text-herb"
          >
            <PartyPopper className="size-4" />
            All in the cart. Time to cook!
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Collapsible "You already have" list */
export function HaveList({ have, pantry }: { have: Ingredient[]; pantry: Ingredient[] }) {
  const [open, setOpen] = useState(false);
  const total = have.length + pantry.length;
  if (total === 0) return null;

  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-herb-soft text-herb">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-ink">You already have</span>
          <span className="block text-[13px] text-ink-soft">
            {total} item{total === 1 ? "" : "s"}
            {pantry.length ? `, including ${pantry.length} pantry staple${pantry.length === 1 ? "" : "s"}` : ""}
          </span>
        </span>
        <ChevronDown className={cn("size-5 text-ink-faint transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {[...have.map((i) => ({ i, pantry: false })), ...pantry.map((i) => ({ i, pantry: true }))].map(({ i, pantry: isPantry }) => (
              <li key={`${isPantry ? "p" : "h"}:${i.name}:${i.original}`} className="flex items-center gap-3 border-t border-line px-4 py-2.5">
                <Check className="size-4 shrink-0 text-herb" strokeWidth={2.5} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{i.original || capitalize(i.name)}</span>
                {isPantry && (
                  <span className="rounded-pill bg-cream-deep px-2 py-0.5 text-[11px] font-semibold text-ink-soft">pantry</span>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
