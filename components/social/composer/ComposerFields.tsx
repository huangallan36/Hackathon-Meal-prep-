"use client";

import type { Ref } from "react";
import { CAPTION_MAX, DISH_NAME_MAX } from "@/lib/social/moderation-policy";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-tile border border-line bg-surface px-4 text-base text-ink shadow-soft transition placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60";

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
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink">Dish name</span>
        <input
          value={dishName}
          onChange={(e) => onDishName(e.target.value)}
          maxLength={DISH_NAME_MAX}
          placeholder="e.g. Garlic butter chicken"
          autoComplete="off"
          enterKeyHint="next"
          disabled={disabled}
          className={cn(field, "h-12")}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">Caption</span>
          <span className="text-xs text-ink-faint">optional</span>
        </span>
        <textarea
          ref={captionRef}
          value={caption}
          onChange={(e) => onCaption(e.target.value.slice(0, CAPTION_MAX))}
          maxLength={CAPTION_MAX}
          rows={3}
          placeholder="How did it turn out? Any tips?"
          disabled={disabled}
          className={cn(field, "resize-none py-3 leading-snug")}
        />
        <span
          aria-live={left <= 20 ? "polite" : "off"}
          className={cn("self-end text-xs tabular-nums", left <= 20 ? "font-semibold text-accent" : "text-ink-faint")}
        >
          {caption.length}/{CAPTION_MAX}
        </span>
      </label>
    </div>
  );
}
