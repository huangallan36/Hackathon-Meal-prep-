"use client";

import { ChefHat, RotateCcw } from "lucide-react";
import Link from "next/link";
import { SmartImage } from "@/components/ui/Misc";
import { Spinner } from "@/components/ui/Spinner";
import type { RecentItem } from "@/lib/planner/hooks";
import { timeAgo } from "@/lib/utils";
import { stagger } from "./RecipeMeta";

/** Small square card for "Recently Made" */
export function RecentCard({
  item,
  index = 0,
  busy,
  onOpen,
}: {
  item: RecentItem;
  index?: number;
  busy?: boolean;
  onOpen: (item: RecentItem) => void;
}) {
  const ago = item.loggedAt ? timeAgo(item.loggedAt) : null;
  const when = ago == null ? "Cooked recently" : ago === "just now" ? "Logged just now" : `Logged ${ago} ago`;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      disabled={busy}
      aria-busy={busy}
      style={stagger(index)}
      className="group block w-[148px] shrink-0 snap-start text-left animate-fade-up transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-cream rounded-tile"
    >
      <span className="relative block overflow-hidden rounded-tile shadow-card">
        <SmartImage src={item.image} alt="" className="aspect-square w-full" />
        <span className="absolute bottom-2 right-2 inline-flex size-8 items-center justify-center rounded-full bg-surface/92 text-ink shadow-soft backdrop-blur">
          {busy ? <Spinner className="size-4 text-accent" /> : <RotateCcw className="size-4" />}
        </span>
      </span>
      <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-snug text-ink">{item.title}</span>
      <span className="mt-0.5 block text-xs text-ink-faint">{when}</span>
    </button>
  );
}

/** Soft placeholder row when nothing has been cooked yet */
export function RecentEmpty() {
  return (
    <div className="flex items-center gap-4 rounded-card border border-dashed border-line bg-surface/60 p-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <ChefHat className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">Nothing yet</span>
        <span className="block text-sm leading-snug text-ink-soft">Cook something with Sous and it shows up here.</span>
      </span>
      <Link
        href="/ai"
        className="inline-flex h-11 shrink-0 items-center rounded-pill px-3 text-sm font-semibold text-accent-strong transition hover:bg-accent-soft active:scale-95"
      >
        Start
      </Link>
    </div>
  );
}
