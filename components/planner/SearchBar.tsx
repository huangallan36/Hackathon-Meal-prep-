"use client";

import type { RefObject } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { MAX_QUERY_LENGTH } from "@/lib/planner/search";
import { cn } from "@/lib/utils";

/**
 * Figma search pill (2.1 / 2.2): white pill, search icon, field, a clear button once there
 * is text, and the 36px mic. Browse state: 50px, 1px line + avocado-soft mic. Search state:
 * 51px, 1.5px avocado outline + solid avocado mic (focus shows the outline too). Enter
 * searches at once and dismisses the phone keyboard; Escape or the X clears.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  onMic,
  active,
  listening,
  busy,
  inputRef,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onMic: () => void;
  /** Search state: green outline + solid mic */
  active?: boolean;
  /** Voice search is listening */
  listening?: boolean;
  busy?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}) {
  const solidMic = active || listening;
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
        inputRef?.current?.blur();
      }}
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5 rounded-pill bg-surface pl-4 pr-1.5 transition-shadow duration-200",
        active
          ? "h-[51px] shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
          : "h-[50px] shadow-[inset_0_0_0_1px_var(--color-line)] focus-within:shadow-[inset_0_0_0_1.5px_var(--color-accent)]",
        className,
      )}
    >
      <span className="flex size-[18px] shrink-0 items-center justify-center">
        {busy ? (
          <Spinner className="size-4 text-accent" />
        ) : (
          <img src="/figma/v2/2014-993/icon-search.svg" alt="" width={18} height={18} className="block size-[18px]" />
        )}
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
        placeholder="Search recipes"
        aria-label="Search recipes, ingredients or cuisines"
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
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
          className="relative inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-cream-deep transition after:absolute after:-inset-2 after:content-[''] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent animate-pop"
        >
          <img src="/figma/v2/2014-1069/icon-x.svg" alt="" width={14} height={14} className="block size-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onMic}
        aria-label={listening ? "Stop voice search" : "Search by voice"}
        aria-pressed={listening}
        className={cn(
          "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          solidMic ? "bg-accent hover:bg-accent-strong" : "bg-accent-soft hover:bg-[#dbe7cc]",
        )}
      >
        {listening && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-accent/35" />}
        <img
          src={solidMic ? "/figma/v2/2014-1069/icon-mic.svg" : "/figma/v2/2014-993/icon-mic.svg"}
          alt=""
          width={18}
          height={18}
          className="relative block size-[18px]"
        />
      </button>
    </form>
  );
}
