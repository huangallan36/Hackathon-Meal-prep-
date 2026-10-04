"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The earlier design's plate + food illustration (planner "Most popular" cards) */
const ASSET = "/figma/screens/2-146";
/** The white plate disc with its soft shadow */
const PLATE = `${ASSET}/ellipse.svg`;

/** The design's three dishes: food disc + topping dots (curry, salmon, salad) */
const DISHES = [
  { disc: "ellipse-1", dots: ["ellipse-2", "ellipse-3", "ellipse-2", "ellipse-3", "ellipse-3"] },
  { disc: "ellipse-4", dots: ["ellipse-3", "ellipse-5", "ellipse-3", "ellipse-5", "ellipse-5"] },
  { disc: "ellipse-6", dots: ["ellipse-7", "ellipse-3", "ellipse-7", "ellipse-3", "ellipse-3"] },
];
/** Dot positions as % of the food disc (from the 158x128 card: 9.6px dots on a 73.7px disc) */
const DOT_POS = [
  [21.5, 25.5],
  [61.5, 38.5],
  [38.5, 63.5],
  [63.5, 65.5],
  [18.5, 55.5],
];

/** Soft frame tints (lemon, avocado, info, cream), picked per recipe so a card keeps its colour; tomato stays for warnings */
const TINTS = ["bg-butter-soft", "bg-accent-soft", "bg-sky-soft", "bg-cream-deep"];
export const plateTint = (seed: number) => TINTS[Math.abs(Math.trunc(seed)) % TINTS.length];

/** False for a missing image and the catalog's generic placeholder (no real photo yet) */
export function hasRecipePhoto(src?: string | null): src is string {
  return Boolean(src) && !/placeholder-dish/.test(src as string);
}

/**
 * A recipe's photo in the design's photo frame (design rules v1: real dishes, photos radius
 * 18, object-cover). Recipe imagery is data: `src` is the recipe's own photo. Recipes without
 * one, or whose photo can't load, show the plate illustration instead (a tinted frame with a
 * white plate and a food disc: plate at 80% of the frame height, food at 72% of the plate).
 * Size the frame with className; overlays (badges, pills) go in children.
 */
export function PlatePhoto({
  src,
  alt,
  seed,
  shape = "tile",
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  /** Picks the tint and the fallback dish (e.g. the recipe id) */
  seed: number;
  /** tile: photos and cards (radius 18); thumb: 60px list thumbs (radius 14, Figma "Similar" rows) */
  shape?: "tile" | "thumb";
  className?: string;
  /** Overlays (badges, pills) positioned against the frame */
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const photo = hasRecipePhoto(src) && failed !== src ? src : null;
  const ready = photo != null && loaded === photo;

  return (
    <span
      className={cn(
        "relative block overflow-hidden",
        shape === "thumb" ? "rounded-thumb" : "rounded-tile",
        photo ? "bg-cream-deep" : plateTint(seed),
        photo && !ready && "skeleton",
        className,
      )}
    >
      {photo ? (
        <img
          src={photo}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(photo)}
          onError={() => setFailed(photo)}
          className={cn("absolute inset-0 block size-full object-cover transition-opacity duration-300", ready ? "opacity-100" : "opacity-0")}
        />
      ) : (
        <PlateArt alt={alt} seed={seed} />
      )}
      {children}
    </span>
  );
}

/** The plate illustration, centred in its frame */
function PlateArt({ alt, seed }: { alt: string; seed: number }) {
  const dish = DISHES[Math.abs(Math.trunc(seed)) % DISHES.length];
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className="absolute left-1/2 top-[10%] block aspect-square h-[80%] -translate-x-1/2"
    >
      {/* The SVG's box adds room for the shadow around the 102.4px disc (Figma insets) */}
      <img src={PLATE} alt="" className="absolute left-[-7.81%] top-[-4.88%] block h-[115.62%] w-[115.62%] max-w-none" />
      <span className="absolute inset-[14%] block overflow-hidden rounded-full">
        <img src={`${ASSET}/${dish.disc}.svg`} alt="" className="absolute inset-0 block size-full max-w-none" />
        {dish.dots.map((dot, i) => (
          <img
            key={i}
            src={`${ASSET}/${dot}.svg`}
            alt=""
            className="absolute block size-[13%] max-w-none"
            style={{ left: `${DOT_POS[i][0]}%`, top: `${DOT_POS[i][1]}%` }}
          />
        ))}
      </span>
    </span>
  );
}
