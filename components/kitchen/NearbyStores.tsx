"use client";

import { MapPin, Navigation, Store } from "lucide-react";
import { motion } from "motion/react";
import { directionsUrl, NEARBY_STORES } from "@/lib/kitchen/groceries";
import { cn } from "@/lib/utils";

const TINTS = ["bg-herb-soft text-herb", "bg-accent-soft text-accent-strong", "bg-butter-soft text-ink", "bg-cream-deep text-ink-soft"];

/** Static store cards with a Google Maps "Directions" link (opens a new tab). */
export function NearbyStores() {
  return (
    <ul className="flex flex-col gap-3">
      {NEARBY_STORES.map((store, i) => (
        <motion.li
          key={store.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3.5 rounded-card bg-surface p-3.5 shadow-card"
        >
          <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-tile", TINTS[i % TINTS.length])}>
            <Store className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{store.name}</p>
            <p className="flex items-center gap-1 truncate text-[13px] text-ink-soft">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {store.area} · {store.km} km
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-herb">
              <span className="size-1.5 rounded-full bg-herb" />
              {store.hours}
            </p>
          </div>
          <a
            href={directionsUrl(store)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Directions to ${store.name}`}
            className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill bg-accent-soft px-3.5 text-[13px] font-semibold text-accent-strong transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Navigation className="size-3.5" />
            Directions
          </a>
        </motion.li>
      ))}
    </ul>
  );
}
