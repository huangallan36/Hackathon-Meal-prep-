"use client";

import type { Ref } from "react";
import { CAPTION_MAX, DISH_NAME_MAX } from "@/lib/social/moderation-policy";
import { cn } from "@/lib/utils";

/** Figma search field (2.1 / 2.2): white, 1px line, 15px text, ink-faint placeholder, flat */
const field =
  "w-full border border-line bg-surface px-4 text-body text-ink transition placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft disabled:opacity-60";

/** Figma small caps label ("WEEKLY AVERAGE"): 12px SemiBold, ink-soft, tracked */
const label = "text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft";

/** Step 2 of the composer: dish name + caption with a character counter. */
export function ComposerFields({
  dishName,
  caption,
  disabled,
  captionRef,
  onDishName,
  onCaption,
}: {
  dishName: string;
  caption: string;
  disabled?: boolean;
  captionRef?: Ref<HTMLTextAreaElement>;
  onDishName: (value: string) => void;
  onCaption: (value: string) => void;
}) {
  const left = CAPTION_MAX - caption.length;
  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className={label}>Dish name</span>
        <input
          value={dishName}
          onChange={(e) => onDishName(e.target.value)}
          maxLength={DISH_NAME_MAX}
          placeholder="e.g. Garlic butter chicken"
          autoComplete="off"
          enterKeyHint="next"
          disabled={disabled}
          className={cn(field, "h-12 rounded-pill")}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <span className={label}>Caption</span>
          <span className="text-caption text-ink-faint">optional</span>
        </span>
        <textarea
          ref={captionRef}
          value={caption}
          onChange={(e) => onCaption(e.target.value.slice(0, CAPTION_MAX))}
          maxLength={CAPTION_MAX}
          rows={3}
          placeholder="How did it turn out? Any tips?"
          disabled={disabled}
          className={cn(field, "resize-none rounded-tile py-3 leading-snug")}
        />
        <span
          aria-live={left <= 20 ? "polite" : "off"}
          className={cn("self-end text-caption tabular-nums", left <= 20 ? "font-semibold text-flame" : "text-ink-faint")}
        >
          {caption.length}/{CAPTION_MAX}
        </span>
      </label>
    </div>
  );
}
