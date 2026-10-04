"use client";

import { Plus, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { dedupeKey, uniqueIngredients } from "@/lib/kitchen/sanitize";
import { cn } from "@/lib/utils";

const QUICK_ADD = ["rice", "garlic", "onion", "butter", "pasta", "potatoes", "broccoli", "salmon", "tofu", "lemon"];

/** Figma chip metrics: 13px medium, 12px sides, 7px top/bottom, pill */
const CHIP = "inline-flex max-w-full items-center rounded-pill py-[7px] text-meta font-medium leading-[normal]";
/** Chips render ~32px tall; this invisible band stretches the hit area to 44px. */
const HIT_AREA = "relative after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']";

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};

const chip: Variants = {
  hidden: { opacity: 0, scale: 0.6, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 520, damping: 26 } },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.15 } },
};

/**
 * Editable ingredient chips + "add ingredient" field, in the Figma chip language:
 * what's in the fridge is the selected set (ink chips, tap to remove), quick adds are
 * neutral white chips. Enter adds; commas add several at once.
 * "egg" is treated as already there when "eggs" is on the list.
 */
export function IngredientEditor({
  ingredients,
  onAdd,
  onRemove,
  autoFocus,
  showQuickAdd = true,
}: {
  ingredients: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  autoFocus?: boolean;
  showQuickAdd?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const have = new Set(ingredients.map(dedupeKey));
  const suggestions = QUICK_ADD.filter((s) => !have.has(dedupeKey(s))).slice(0, 6);

  function submit() {
    uniqueIngredients(draft.split(/[,;\n]/))
      .filter((name) => !have.has(dedupeKey(name)))
      .forEach(onAdd);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3" aria-label="Your ingredients">
        <SectionHeader title="In your fridge" />

        {ingredients.length > 0 && (
          <motion.ul variants={list} initial="hidden" animate="show" className="relative flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {ingredients.map((name) => (
                <motion.li key={name} layout variants={chip} exit="exit" className="max-w-full">
                  <button
                    type="button"
                    onClick={() => onRemove(name)}
                    aria-label={`Remove ${name}`}
                    className={cn(
                      HIT_AREA,
                      CHIP,
                      "group gap-1.5 bg-ink pl-3 pr-2 text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
                    )}
                  >
                    <span className="min-w-0 truncate">{name}</span>
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/30">
                      <X className="size-3" strokeWidth={2.5} />
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}

        {/* Figma search-bar shape: white pill, 1px line, 18px icon, 15px text */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2.5 rounded-pill bg-surface py-1.5 pl-4 pr-1.5 shadow-card transition-shadow focus-within:shadow-[0_0_0_1.5px_var(--color-accent)]"
        >
          <Plus className="size-[18px] shrink-0 text-ink-faint" strokeWidth={2} aria-hidden />
          <label htmlFor="add-ingredient" className="sr-only">
            Add an ingredient
          </label>
          <input
            id="add-ingredient"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ingredients.length ? "Add something I missed" : "e.g. eggs, spinach, rice"}
            autoFocus={autoFocus}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            maxLength={120}
            className="h-9 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <Button type="submit" size="sm" variant="soft" className="h-9 px-4 text-meta" disabled={!draft.trim()}>
            Add
          </Button>
        </form>
      </section>

      {showQuickAdd && suggestions.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Quick add">
          <SectionHeader title="Quick add" />
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                aria-label={`Add ${s}`}
                className={cn(
                  HIT_AREA,
                  CHIP,
                  "gap-1 border border-line bg-surface px-3 text-ink transition hover:border-accent/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                <Plus className="size-3.5 text-ink-soft" strokeWidth={2.2} />
                {s}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
