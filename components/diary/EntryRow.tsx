"use client";

import { fmt, isFresh } from "@/lib/diary/stats";
import type { DiaryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EstimatedBadge, JustLoggedTag, SousTag } from "./EntryBits";

/**
 * Figma 3.3 food row: name, portion (13px, right-aligned) and kcal (14px semibold). The row
 * is a button that opens the entry sheet; "Just logged / Estimated / via Sous" sit under the name.
 */
export function EntryRow({ entry, onOpen, className }: { entry: DiaryEntry; onOpen: (id: string) => void; className?: string }) {
  const fresh = isFresh(entry);
  const showTags = fresh || entry.estimated || entry.source === "ai";
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      data-entry-id={entry.id}
      aria-label={`${entry.name}${entry.portion ? `, ${entry.portion}` : ""}, ${fmt(entry.nutrition.calories)} kcal. Open details`}
      className={cn(
        "-mx-2 flex w-[calc(100%+16px)] items-center gap-2 rounded-thumb px-2 py-2 text-left leading-[normal] transition hover:bg-cream active:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        fresh && "bg-flame-soft/40",
        className,
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm text-ink">{entry.name}</span>
        {showTags && (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {fresh && <JustLoggedTag />}
            {entry.estimated && <EstimatedBadge />}
            {entry.source === "ai" && <SousTag />}
          </span>
        )}
      </span>
      {entry.portion && <span className="line-clamp-2 w-16 shrink-0 text-right text-meta text-ink-soft">{entry.portion}</span>}
      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{fmt(entry.nutrition.calories)}</span>
    </button>
  );
}
