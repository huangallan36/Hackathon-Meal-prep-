import type { ReactNode } from "react";
import { SmartImage } from "@/components/ui/Misc";
import { cn } from "@/lib/utils";

/** Figma 2.3 plate + food illustration assets (planner "Most popular" cards) */
const ASSET = "/figma/screens/2-146";
/** The white plate disc with its soft shadow */
const PLATE = `${ASSET}/ellipse.svg`;
/** Recipes without a real photo (the bundled demo catalog) carry this app placeholder */
const APP_PLACEHOLDER = "/placeholder-dish.svg";

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

/** Figma photo-frame tints (peach, blush, sage, sky), picked per recipe so a card keeps its color */
const TINTS = ["bg-butter-soft", "bg-flame-soft", "bg-accent-soft", "bg-sky-soft"];
export const plateTint = (seed: number) => TINTS[Math.abs(Math.trunc(seed)) % TINTS.length];

/**
 * Figma 2.3 recipe image treatment: a tinted rounded frame with a white plate disc and the
 * dish in the middle. The plate is 80% of the frame height (10% from the top) and the
 * photo 72% of the plate, as in the design's 158x128 cards. Recipes with no real photo
 * show the design's own food illustration instead of a picture of a placeholder.
 * Size the frame with className.
 */
export function PlatePhoto({
  src,
  alt,
  seed,
  className,
  children,
}: {
  src?: string | null;
  alt: string;
  /** Picks the tint and the fallback dish (e.g. the recipe id) */
  seed: number;
  className?: string;
  /** Overlays (badges, pills) positioned against the frame */
  children?: ReactNode;
}) {
  const n = Math.abs(Math.trunc(seed));
  const dish = DISHES[n % DISHES.length];
  const photo = src && src !== APP_PLACEHOLDER ? src : null;

  return (
    <span className={cn("relative block overflow-hidden rounded-tile", plateTint(seed), className)}>
      <span className="absolute left-1/2 top-[10%] block aspect-square h-[80%] -translate-x-1/2">
        {/* The SVG's box adds room for the shadow around the 102.4px disc (Figma insets) */}
        <img src={PLATE} alt="" className="absolute left-[-7.81%] top-[-4.88%] block h-[115.62%] w-[115.62%] max-w-none" />
        <span className="absolute inset-[14%] block overflow-hidden rounded-full">
          {photo ? (
            <SmartImage src={photo} alt={alt} className="size-full" fallback={`${ASSET}/${dish.disc}.svg`} />
          ) : (
            <span role="img" aria-label={alt} className="relative block size-full">
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
          )}
        </span>
      </span>
      {children}
    </span>
  );
}
