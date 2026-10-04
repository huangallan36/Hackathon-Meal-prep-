"use client";

import { Search, X } from "lucide-react";
import type { RefObject } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { MAX_QUERY_LENGTH } from "@/lib/planner/search";
import { cn } from "@/lib/utils";

/**
 * Pill search field. Typing is debounced by the page; Enter searches immediately and
 * dismisses the phone keyboard; Escape or the X clears.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  busy,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  busy?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        inputRef?.current?.blur();
      }}
      className={cn("relative", className)}
    >
      <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-faint">
        {busy ? <Spinner className="size-5 text-accent" /> : <Search className="size-5" />}
      </span>
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={MAX_QUERY_LENGTH}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onClear();
          }
        }}
        placeholder="Search recipes or ingredients"
        aria-label="Search recipes, ingredients or cuisines"
        className={cn(
          "h-14 w-full rounded-pill bg-surface pl-[52px] text-base text-ink shadow-card outline-none ring-1 ring-line transition-shadow placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
          value ? "pr-14" : "pr-5",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onClear();
            inputRef?.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft transition hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-pop"
        >
          <X className="size-5" />
        </button>
      )}
    </form>
  );
}
