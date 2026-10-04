"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet inside the phone frame (fixed = relative to the phone). Sits above the
 * bottom nav and floating orb, below toasts. Escape or a backdrop tap closes it.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-[55] bg-ink/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet-panel"
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === "string" ? title : undefined}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[56] max-h-[88%] overflow-y-auto rounded-t-[28px] bg-surface px-5 pb-[calc(var(--safe-bottom)+20px)] pt-3 shadow-lift no-scrollbar",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
            {title && (
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="-mr-2 inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-deep active:scale-95"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
