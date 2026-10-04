"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { dictate } from "@/lib/kitchen/client";
import { parseGroceryItems } from "@/lib/kitchen/groceries";
import { toast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { isSttSupported } from "@/lib/voice/engine";

const ICON_PLUS = "/figma/screens/2-152/icon-plus.svg";
/** The design's search-bar mic (2.3 idle on green tint, 2.5 white on green while listening) */
const ICON_MIC = "/figma/screens/2-146/icon-mic.svg";
const ICON_MIC_ON = "/figma/screens/2-148/icon-mic.svg";

/** Hit band so the 18px text links get a 44px tap target without changing the layout */
const HIT = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/**
 * Figma 2.4 "+ Add item — or just say it". "Add item" opens a field; "just say it" opens it
 * and dictates straight into the list ("milk and paper towels" adds two rows).
 */
export function AddGroceryItem({ onAdd }: { onAdd: (names: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const interim = useVoice((s) => s.interim);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function add(text: string): boolean {
    const names = parseGroceryItems(text);
    if (names.length === 0) return false;
    onAdd(names);
    return true;
  }

  function openField() {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function sayIt() {
    if (listening) return;
    setOpen(true);
    if (!isSttSupported()) {
      toast("Voice input isn't available in this browser. Type it instead.", "warning");
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setListening(true);
    const heard = await dictate();
    if (!mounted.current) return;
    setListening(false);
    if (heard && add(heard)) {
      setDraft("");
      setOpen(false);
    } else {
      if (heard) setDraft(heard);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function close() {
    setOpen(false);
    setDraft("");
  }

  return (
    <div className="w-full pt-3">
      {!open ? (
        <p className="flex items-center text-sm font-semibold leading-[normal] text-accent">
          <button
            type="button"
            onClick={openField}
            className={cn(HIT, "inline-flex items-center gap-2 rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent")}
          >
            <img src={ICON_PLUS} alt="" width={16} height={16} className="size-4 shrink-0" />
            Add item
          </button>
          <span aria-hidden className="whitespace-pre">
            {" — "}
          </span>
          <button
            type="button"
            onClick={() => void sayIt()}
            className={cn(HIT, "rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent")}
          >
            <span className="sr-only">Add an item by voice: </span>or just say it
          </button>
        </p>
      ) : (
        <motion.form
          ref={formRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          onSubmit={(e) => {
            e.preventDefault();
            if (add(draft)) setDraft("");
            inputRef.current?.focus();
          }}
          onBlur={(e) => {
            // Close when focus leaves the whole field with nothing typed (not when tapping the mic).
            if (!draft.trim() && !listening && !formRef.current?.contains(e.relatedTarget as Node | null)) close();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className={cn(
            "flex items-center gap-2.5 rounded-pill bg-surface py-1.5 pl-4 pr-1.5 transition-shadow",
            listening ? "shadow-[0_0_0_1.5px_var(--color-accent)]" : "shadow-card focus-within:shadow-[0_0_0_1.5px_var(--color-accent)]",
          )}
        >
          <img src={ICON_PLUS} alt="" width={16} height={16} className="size-4 shrink-0" />
          <label htmlFor="grocery-add" className="sr-only">
            Add an item
          </label>
          <input
            ref={inputRef}
            id="grocery-add"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={listening ? interim || "Listening…" : "Add an item, e.g. paper towels"}
            autoComplete="off"
            autoCapitalize="none"
            enterKeyHint="done"
            maxLength={120}
            className={cn(
              "h-9 min-w-0 flex-1 bg-transparent text-base text-ink focus:outline-none",
              listening ? "placeholder:text-ink" : "placeholder:text-ink-faint",
            )}
          />
          <button
            type="button"
            onClick={() => void sayIt()}
            aria-label={listening ? "Listening" : "Say it"}
            aria-pressed={listening}
            className={cn(
              "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              listening ? "bg-accent" : "bg-accent-soft",
            )}
          >
            {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-accent/30" />}
            <img src={listening ? ICON_MIC_ON : ICON_MIC} alt="" width={18} height={18} className="relative size-[18px]" />
          </button>
          <Button type="submit" size="sm" className="h-9 px-4 text-meta" disabled={!draft.trim()}>
            Add
          </Button>
        </motion.form>
      )}
    </div>
  );
}
