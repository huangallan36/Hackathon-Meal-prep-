"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Figma 2.4 assets (updated file, node 2014-1255) */
const ICON_CHECK = "/figma/v2/2014-1255/icon-check.svg";

export interface GroceryLine {
  /** useKitchen.groceryChecked key */
  key: string;
  /** Lowercase item name as stored (recipe ingredient name or the extra's name) */
  item: string;
  /** Display name, capitalized */
  name: string;
  /** "2 lb", "1 bunch" ("" when unknown) */
  qty: string;
  /** need: from the recipe; extra: added by hand; fridge: covered by the scan; pantry: staple */
  kind: "need" | "extra" | "fridge" | "pantry";
  checked: boolean;
}

/** Figma 2.4 segmented control: cream-deep track, 4px padding, white active segment */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex w-full rounded-pill bg-cream-deep p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex flex-1 justify-center rounded-pill py-2 text-meta font-semibold leading-[normal] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              on ? "text-ink" : "text-ink-soft",
            )}
          >
            {on && (
              <motion.span
                layoutId="grocery-segment"
                className="absolute inset-0 rounded-pill bg-surface"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 22px circle: 1.5px line-strong ring, or avocado with the design's white 13px check */
export function CheckCircle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors duration-200",
        on ? "bg-accent" : "border-[1.5px] border-line-strong",
      )}
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.img
            key="check"
            src={ICON_CHECK}
            alt=""
            width={13}
            height={13}
            className="size-[13px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 24 }}
          />
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Figma 2.4 list card: white, 1px line, radius 20, rows divided by 1px lines.
 * Need/extra rows toggle (persisted by the caller); fridge/pantry rows are informational.
 */
export function GroceryList({
  lines,
  onToggle,
  onRemoveExtra,
  empty,
}: {
  lines: GroceryLine[];
  onToggle: (key: string) => void;
  onRemoveExtra: (line: GroceryLine) => void;
  /** Shown inside the card when there are no lines */
  empty?: ReactNode;
}) {
  return (
    <ul className="relative w-full overflow-hidden rounded-[20px] bg-surface px-4 shadow-card">
      <AnimatePresence initial={false} mode="popLayout">
        {lines.map((line) => (
          <motion.li
            key={line.key}
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center border-b border-line last:border-b-0"
          >
            <Row line={line} onToggle={onToggle} onRemoveExtra={onRemoveExtra} />
          </motion.li>
        ))}
      </AnimatePresence>
      {lines.length === 0 && empty && <li className="py-3.5">{empty}</li>}
    </ul>
  );
}

function Row({
  line,
  onToggle,
  onRemoveExtra,
}: {
  line: GroceryLine;
  onToggle: (key: string) => void;
  onRemoveExtra: (line: GroceryLine) => void;
}) {
  const on = line.checked || line.kind === "fridge" || line.kind === "pantry";
  const toggles = line.kind === "need" || line.kind === "extra";
  const removable = line.kind === "extra" && !line.checked;

  const right = on ? (
    <span className="shrink-0 whitespace-nowrap text-meta font-normal text-ink-soft">
      {line.kind === "pantry" ? "pantry" : "have"}
    </span>
  ) : line.qty ? (
    <span className="shrink-0 whitespace-nowrap text-meta font-semibold text-ink">{line.qty}</span>
  ) : null;

  const body = (
    <>
      <CheckCircle on={on} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-body font-medium leading-[normal] transition-colors",
          on ? "text-ink-soft line-through" : "text-ink",
        )}
      >
        {line.name}
      </span>
      {!removable && right}
    </>
  );

  return (
    <>
      {toggles ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={line.checked}
          onClick={() => onToggle(line.key)}
          className="flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3.5">{body}</div>
      )}
      {removable && (
        <button
          type="button"
          onClick={() => onRemoveExtra(line)}
          aria-label={`Remove ${line.name}`}
          className="relative -mr-1.5 ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-mute transition after:absolute after:-inset-1.5 after:content-[''] hover:bg-cream-deep hover:text-ink-soft active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" strokeWidth={2.2} />
        </button>
      )}
    </>
  );
}
