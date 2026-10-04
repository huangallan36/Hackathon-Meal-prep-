"use client";

import { Navigation } from "lucide-react";
import { Sheet } from "@/components/voice/Sheet";
import { directionsUrl, NEARBY_STORES } from "@/lib/kitchen/groceries";
import { useMapView } from "@/lib/stores/map";
import { cn } from "@/lib/utils";

/** Google's keyless embed of a place search, centred on the store */
const embedUrl = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;

/**
 * The store map inside the app: a sheet with an embedded Google map of the chosen store,
 * a switch between the nearby stores, and "Directions", which hands off to the phone's maps
 * app (or a Maps tab on a laptop). Opened by the grocery screen's "Map" link or by voice
 * ("open the map"). Mounted once by the shell so it works over any screen.
 */
export function MapSheet() {
  const index = useMapView((s) => s.store);
  const open = useMapView((s) => s.open);
  const close = useMapView((s) => s.close);
  const store = index == null ? null : NEARBY_STORES[index];

  return (
    <Sheet open={store != null} onClose={close} title={store?.name ?? "Map"}>
      {store && (
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-meta text-ink-soft">
            {store.km.toFixed(1)} km · {store.hours} · {store.area}
          </p>
          <div className="h-[300px] w-full overflow-hidden rounded-tile border border-line bg-cream-deep">
            <iframe
              key={store.name}
              src={embedUrl(`${store.name}, ${store.area}`)}
              title={`Map of ${store.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block size-full border-0"
            />
          </div>
          {NEARBY_STORES.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Store">
              {NEARBY_STORES.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  aria-pressed={i === index}
                  onClick={() => open(i)}
                  className={cn(
                    "min-h-10 flex-1 rounded-pill border px-3 text-meta font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    i === index ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink",
                  )}
                >
                  {s.short} · {s.km.toFixed(1)} km
                </button>
              ))}
            </div>
          )}
          <a
            href={directionsUrl(store)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-pill bg-accent text-body font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Navigation className="size-4" aria-hidden />
            Directions
          </a>
        </div>
      )}
    </Sheet>
  );
}
