"use client";

import { Fragment } from "react";
import { SectionHeader } from "@/components/ui/Card";
import { useMapView } from "@/lib/stores/map";
import {
  CHEAPEST_STORE,
  formatDollars,
  NEARBY_STORES,
  storeEstimate,
  type NearbyStore,
} from "@/lib/kitchen/groceries";
import type { Ingredient } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Figma 2.4 "Nearby stores": Bricolage 18 header with a "Map" link (shows the selected store on
 * the in-app map, MapSheet), then the store cards side by side: the storefront photo (84px, radius 12), the
 * name (15 SemiBold), distance and hours (11, ink-soft) and "About $18.40" for what's still on
 * the list. The cheapest store starts selected (1.5px avocado border + "Cheapest" badge).
 * The photos are credited right under the cards.
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
  const openMap = useMapView((s) => s.open);
  return (
    // id: Sous scrolls here when asked "where can I get groceries?"
    <section id="nearby-stores" className="flex scroll-mt-16 flex-col gap-3 px-5 pt-5" aria-label="Nearby stores">
      <SectionHeader
        title="Nearby stores"
        action={
          <button
            type="button"
            onClick={() => openMap(NEARBY_STORES.indexOf(store))}
            aria-label={`Show ${store.name} on the map`}
            className="relative text-meta font-semibold text-accent after:absolute after:-inset-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Map
          </button>
        }
      />
      <div className="flex gap-2.5">
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
      <PhotoCredits />
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
      aria-label={`${store.name}, ${store.km} km, ${store.hours}, about ${formatDollars(estimate)}${cheapest ? ", cheapest" : ""}`}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-start gap-2 rounded-tile border bg-surface px-2.5 pb-3 pt-2.5 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        // Figma: 1px line, or 1.5px avocado when selected (the extra half pixel sits outside, so nothing shifts)
        selected ? "border-accent shadow-[0_0_0_0.5px_var(--color-accent)]" : "border-line",
      )}
    >
      <img
        src={store.photo}
        alt=""
        width={160}
        height={84}
        loading="lazy"
        decoding="async"
        title={`“${store.credit.title}” by ${store.credit.author}, ${store.credit.license}`}
        className="block h-[84px] w-full rounded-[12px] bg-cream-deep object-cover"
      />
      {/* Figma: name and badge spread apart (no gap), so "Superstore" + "Cheapest" fit a 375px screen */}
      <span className="flex w-full items-center justify-between">
        <span className="min-w-0 truncate text-body font-semibold leading-[normal] text-ink">{store.short}</span>
        {cheapest && (
          <span className="shrink-0 rounded-pill bg-accent-soft px-1.5 py-0.5 text-micro font-bold leading-[normal] text-accent">
            Cheapest
          </span>
        )}
      </span>
      <span className="w-full truncate text-caption leading-[normal] text-ink-soft">
        {store.km.toFixed(1)} km · {store.hours}
      </span>
      <span className="text-meta font-semibold leading-[normal] text-ink">About {formatDollars(estimate)}</span>
    </button>
  );
}

/** Design rules v1: credit every photo (full titles in public/CREDITS.md and on hover) */
function PhotoCredits() {
  return (
    <p className="text-micro leading-[1.4] text-ink-faint">
      Store photos:{" "}
      {NEARBY_STORES.map((s, i) => (
        <Fragment key={s.name}>
          {i > 0 && " · "}
          {s.credit.author} (
          <a href={s.credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            {s.credit.license}
          </a>
          )
        </Fragment>
      ))}
    </p>
  );
}
