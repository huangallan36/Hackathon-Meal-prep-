"use client";

import { EllipsisVertical } from "lucide-react";
import { fmt, isFresh, timeLabel } from "@/lib/diary/stats";
import type { DiaryEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EstimatedBadge, FoodThumb, JustLoggedTag, MacroLine, SousTag } from "./EntryBits";

/** One logged food. The whole row is a button that opens the entry sheet. */
export function EntryRow({ entry, onOpen, className }: { entry: DiaryEntry; onOpen: (id: string) => void; className?: string }) {
  const fresh = isFresh(entry);
  const showTags = fresh || entry.estimated || entry.source === "ai";
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.id)}
      aria-label={`${entry.name}, ${fmt(entry.nutrition.calories)} kcal. Open details`}
      className={cn(
        "flex w-full items-start gap-3 rounded-tile p-2 text-left transition hover:bg-cream active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        fresh && "bg-herb-soft/50",
        className,
      )}
    >
      <FoodThumb entry={entry} className="size-14" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{entry.name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">
          {entry.portion} · {timeLabel(entry.loggedAt)}
        </p>
        <MacroLine n={entry.nutrition} className="mt-1" />
        {showTags && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {fresh && <JustLoggedTag />}
            {entry.estimated && <EstimatedBadge />}
            {entry.source === "ai" && <SousTag />}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
        <div className="text-right">
          <p className="text-[15px] font-semibold leading-tight tabular-nums text-ink">{fmt(entry.nutrition.calories)}</p>
          <p className="text-[11px] text-ink-faint">kcal</p>
        </div>
        <EllipsisVertical className="-mr-1 mt-0.5 size-4 text-ink-faint" aria-hidden />
      </div>
    </button>
  );
}
