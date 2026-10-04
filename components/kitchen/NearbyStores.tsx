"use client";

import { SectionHeader } from "@/components/ui/Card";
import {
  CHEAPEST_STORE,
  directionsUrl,
  formatDollars,
  NEARBY_STORES,
  storeEstimate,
  type NearbyStore,
} from "@/lib/kitchen/groceries";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_PIN = "/figma/screens/2-152/icon-pin.svg";

/**
 * Figma 2.4 "Nearby stores": Fraunces header with a "Map" link (opens the selected store in
 * Google Maps), then horizontally scrolling store cards with a basket estimate for what's
 * still on the list. The cheapest store starts selected (green border + "Cheapest" badge).
 */
export function NearbyStores({
  items,
  selected,
  onSelect,
}: {
  /** What's still to buy, for the estimate */
  items: Pick<Ingredient, "name" | "aisle">[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  const store = NEARBY_STORES[selected] ?? NEARBY_STORES[CHEAPEST_STORE];
  return (
    <section className="flex flex-col gap-3 px-5 pt-5" aria-label="Nearby stores">
      <SectionHeader
        title="Nearby stores"
        action={
          <a
            href={directionsUrl(store)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${store.name} in Maps`}
            className="relative text-meta font-semibold text-accent after:absolute after:-inset-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Map
          </a>
        }
      />
      {/* A little vertical padding keeps the selected card's outer ring from being clipped */}
      <div className="no-scrollbar -mx-5 -my-0.5 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 py-0.5">
        {NEARBY_STORES.map((s, i) => (
          <StoreCard
            key={s.name}
            store={s}
            estimate={storeEstimate(s, items)}
            cheapest={i === CHEAPEST_STORE}
            selected={i === selected}
            onSelect={() => onSelect(i)}
          />
        ))}
      </div>
    </section>
  );
}

function StoreCard({
  store,
  estimate,
  cheapest,
  selected,
  onSelect,
}: {
  store: NearbyStore;
  estimate: number;
  cheapest: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${store.name}, ${store.km} km, ${store.hours}, estimated ${formatDollars(estimate)}${cheapest ? ", cheapest" : ""}`}
      className={cn(
        "flex w-[162px] shrink-0 snap-start flex-col items-start gap-2 rounded-tile border bg-surface px-2.5 pb-3 pt-2.5 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        // Figma: 1px line, or 1.5px accent when selected (the extra half pixel sits outside, so nothing shifts)
        selected ? "border-accent shadow-[0_0_0_0.5px_var(--color-accent)]" : "border-line",
      )}
    >
      <MapTile />
      <span className="flex w-full items-center justify-between gap-1">
        <span className="min-w-0 truncate text-body font-semibold leading-[normal] text-ink">{store.short}</span>
        {cheapest && (
          <span className="shrink-0 rounded-pill bg-accent-soft px-[7px] py-0.5 text-micro font-bold leading-[normal] text-accent">
            Cheapest
          </span>
        )}
      </span>
      <span className="w-full truncate text-caption leading-[normal] text-ink-soft">
        {store.km.toFixed(1)} km · {store.hours}
      </span>
      <span className="text-meta font-semibold leading-[normal] text-ink">Est. {formatDollars(estimate)}</span>
    </button>
  );
}

/** The design's little map: green tile, white streets, orange pin */
function MapTile() {
  return (
    <span aria-hidden className="relative block h-[60px] w-full overflow-hidden rounded-[12px] bg-[#e7eee4]">
      <span className="absolute left-0 top-[22px] h-2 w-full bg-surface" />
      <span className="absolute left-[60px] top-0 h-full w-2 bg-surface" />
      <span className="absolute left-0 top-[46px] h-[5px] w-full bg-surface" />
      <img src={ICON_PIN} alt="" width={22} height={22} className="absolute left-[58px] top-[14px] size-[22px]" />
    </span>
  );
}
