"use client";

import { Plus, X } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { uniqueIngredients } from "@/lib/kitchen/sanitize";
import { cn } from "@/lib/utils";

const QUICK_ADD = ["rice", "garlic", "onion", "butter", "pasta", "potatoes", "broccoli", "salmon", "tofu", "lemon"];

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
 * Editable ingredient chips + "add ingredient" input. Tapping a chip removes it
 * (the whole chip is the hit target, 40px tall). Comma-separated input adds several.
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
  const suggestions = QUICK_ADD.filter((s) => !ingredients.includes(s)).slice(0, 6);

  function submit() {
    const names = uniqueIngredients(draft.split(/[,\n]/));
    names.forEach(onAdd);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      {ingredients.length > 0 && (
        <motion.ul variants={list} initial="hidden" animate="show" className="relative flex flex-wrap gap-2" aria-label="Your ingredients">
          <AnimatePresence mode="popLayout">
            {ingredients.map((name) => (
              <motion.li key={name} layout variants={chip} exit="exit">
                <button
                  type="button"
                  onClick={() => onRemove(name)}
                  aria-label={`Remove ${name}`}
                  className="group inline-flex h-10 max-w-[260px] items-center gap-1.5 rounded-pill border border-line bg-surface pl-3.5 pr-1.5 text-[15px] font-medium text-ink shadow-soft transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="truncate">{name}</span>
                  <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-cream-deep text-ink-soft transition group-hover:bg-accent-soft group-hover:text-accent-strong">
                    <X className="size-3.5" strokeWidth={2.5} />
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-pill border border-line bg-surface py-1 pl-4 pr-1 shadow-soft transition focus-within:border-accent/50 focus-within:ring-4 focus-within:ring-accent/15"
      >
        <Plus className="size-4 shrink-0 text-ink-faint" aria-hidden />
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
          enterKeyHint="done"
          maxLength={120}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <Button type="submit" size="sm" variant="soft" className="h-11 px-5" disabled={!draft.trim()}>
          Add
        </Button>
      </form>

      {showQuickAdd && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onAdd(s)}
                className={cn(
                  "inline-flex h-10 items-center gap-1 rounded-pill border border-dashed border-line px-3.5 text-sm font-medium text-ink-soft transition",
                  "hover:border-accent/40 hover:text-accent-strong active:scale-95",
                )}
              >
                <Plus className="size-3.5" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
