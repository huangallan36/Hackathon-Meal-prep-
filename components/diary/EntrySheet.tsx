"use client";

import { Share2, Trash, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { fmt, MEAL_LABEL, timeLabel } from "@/lib/diary/stats";
import { useDiary } from "@/lib/stores/diary";
import { useSocial } from "@/lib/stores/social";
import { toast } from "@/lib/stores/toast";
import type { DiaryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EstimatedBadge, FoodThumb, SousTag } from "./EntryBits";
import { HIT_AREA } from "./hitArea";

/**
 * Bottom sheet with an entry's full nutrition, "Share to Social" (photo entries) and a
 * two-step delete. Pass `entry = undefined` to close; it animates out.
 */
export function EntrySheet({ entry, onClose }: { entry: DiaryEntry | undefined; onClose: () => void }) {
  const open = !!entry;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // The sheet sits over the phone's scroll container: freeze it while open
    const scroller = document.getElementById("sous-scroll");
    const prevOverflow = scroller?.style.overflowY ?? "";
    if (scroller) scroller.style.overflowY = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      if (scroller) scroller.style.overflowY = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          key="entry-sheet"
          className="fixed inset-0 z-[58]"
          role="dialog"
          aria-modal="true"
          aria-label={entry.name}
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="no-scrollbar absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-[28px] bg-surface px-5 pb-[calc(var(--safe-bottom)+20px)] pt-3 shadow-lift"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
            <SheetBody key={entry.id} entry={entry} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SheetBody({ entry, onClose }: { entry: DiaryEntry; onClose: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const n = entry.nutrition;

  function share() {
    if (!entry.image) return;
    useSocial.getState().setDraft({ image: entry.image, dishName: entry.name, recipeId: entry.recipeId });
    onClose();
    router.push("/social/new");
  }

  function remove() {
    useDiary.getState().removeEntry(entry.id);
    onClose();
    toast("Removed from your diary");
  }

  const cells = [
    { label: "Protein", value: n.protein, dot: "bg-protein" },
    { label: "Carbs", value: n.carbs, dot: "bg-carbs" },
    { label: "Fat", value: n.fat, dot: "bg-fat" },
    { label: "Fiber", value: n.fiber, dot: "bg-fiber" },
  ];

  return (
    <div className="mt-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
            {MEAL_LABEL[entry.meal]} · {timeLabel(entry.loggedAt)}
          </p>
          <h2 className="mt-1 font-display text-[22px] font-semibold leading-tight text-ink">{entry.name}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">{entry.portion}</p>
        </div>
        <IconButton label="Close" onClick={onClose} className={cn(HIT_AREA, "shrink-0")}>
          <X className="size-5" />
        </IconButton>
      </div>

      {entry.image ? <FoodThumb entry={entry} rounded="rounded-card" className="mt-4 h-44 w-full" /> : null}

      <div className="mt-4 flex items-center gap-4 rounded-tile bg-cream p-4">
        {!entry.image && <FoodThumb entry={entry} className="size-14" />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Calories</p>
          <p className="font-display text-3xl font-semibold leading-none tabular-nums text-ink">
            {fmt(n.calories)} <span className="font-sans text-sm font-medium text-ink-soft">kcal</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {entry.estimated && <EstimatedBadge />}
          {entry.source === "ai" && <SousTag />}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-tile border border-line px-2 py-2.5 text-center">
            <p className="text-[15px] font-semibold tabular-nums text-ink">
              {fmt(c.value)}
              <span className="text-xs font-medium text-ink-soft">g</span>
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-soft">
              <span className={cn("size-1.5 rounded-full", c.dot)} aria-hidden />
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {entry.estimated && (
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Sous estimated these numbers from your {entry.image ? "photo" : "description"}. They are a best guess, not a lab result.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {confirming ? (
          <div className="animate-pop rounded-tile bg-cream p-3">
            <p className="text-center text-sm font-semibold text-ink">Delete this entry from your diary?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
              <Button variant="danger" icon={<Trash className="size-4" />} onClick={remove}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <>
            {entry.image && (
              <Button full icon={<Share2 className="size-4" />} onClick={share}>
                Share to Social
              </Button>
            )}
            <Button full variant="ghost" className="text-danger" icon={<Trash className="size-4" />} onClick={() => setConfirming(true)}>
              Delete entry
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
