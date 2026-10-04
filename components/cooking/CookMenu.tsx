"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";
import { COOK_ICON } from "./icons";

export interface CookMenuItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
}

/** The header's 40px "more" button (Figma 2.3) and its small menu */
export function CookMenu({ items }: { items: CookMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  // Close on a tap outside or Escape; focus the first item when it opens.
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    function onDown(e: PointerEvent) {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const list = [...(menu.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = (at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  }

  return (
    <div ref={root} className="relative">
      <IconButton
        label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <img src={COOK_ICON.more} alt="" width={20} height={20} className="block size-5" />
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menu}
            id={`${id}-menu`}
            role="menu"
            aria-label="Cooking options"
            onKeyDown={onMenuKey}
            initial={{ opacity: 0, scale: 0.94, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-[calc(100%+8px)] z-40 flex w-[208px] origin-top-right flex-col rounded-tile bg-surface p-1.5 shadow-[0_0_0_1px_var(--color-line),0_14px_32px_-12px_rgb(51_38_26/0.28)]"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex h-11 items-center gap-3 rounded-[12px] px-3 text-left text-body font-medium text-ink transition hover:bg-cream focus-visible:bg-cream focus-visible:outline-none active:bg-cream-deep [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-ink-soft"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
