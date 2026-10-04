"use client";

import { ChefHat } from "lucide-react";
import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { madeLabel } from "@/lib/planner/format";
import type { RecentItem } from "@/lib/planner/hooks";
import { Plate } from "./Plate";
import { stagger } from "./RecipeMeta";

/** Figma "Recently made" plate: 100px disc, title (13), "Made Tue" (11) */
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
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      disabled={busy}
      aria-busy={busy}
      style={stagger(index)}
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-tile text-center animate-fade-up transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
    >
      <span className="relative block">
        <Plate slot="recent" index={index} size={100} src={item.image} />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/60">
            <Spinner className="size-5 text-accent" />
          </span>
        )}
      </span>
      <span className="block w-full truncate text-meta font-semibold leading-[normal] text-ink">{item.title}</span>
      <span className="block w-full truncate text-caption leading-[normal] text-ink-soft">{madeLabel(item.loggedAt)}</span>
    </button>
  );
}

/** Nothing cooked yet: a quiet row pointing at Home, where cooking starts */
export function RecentEmpty() {
  return (
    <div className="flex items-center gap-3 rounded-tile border border-line bg-surface p-3 pl-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <ChefHat className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-ink">Nothing yet</span>
        <span className="block text-xs leading-snug text-ink-soft">Cook something with Sous and it shows up here.</span>
      </span>
      <Link
        href="/ai"
        className="inline-flex h-11 shrink-0 items-center rounded-pill px-3 text-meta font-semibold text-accent transition hover:bg-accent-soft active:scale-95"
      >
        Start
      </Link>
    </div>
  );
}
