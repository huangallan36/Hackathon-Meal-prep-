"use client";

/**
 * The planner's food imagery (Figma v2 "photo/…" frames): a real recipe or ingredient photo,
 * full-bleed in a disc, a 14px thumb, or the 158x128 "Most popular" tile (radius 18).
 * Photos are data (recipe.image, ingredient.image). When there is no real photo yet (catalog
 * placeholder, missing image), or it fails to load, the v1 plate illustration for that slot
 * shows instead, so the screen never has a hole in it.
 */
import { SmartImage } from "@/components/ui/Misc";
import { cn } from "@/lib/utils";

const S146 = "/figma/screens/2-146";
const S148 = "/figma/screens/2-148";

/** White plate with its soft shadow (v1 Figma "Ellipse" 102.4, drawn 118.4 to fit the shadow) */
const PLATE = `${S146}/ellipse.svg`;

/** Food circles (v1 Figma 73.7 "Ellipse" gradients): curry, salmon, pasta */
const FOOD = [`${S146}/ellipse-1.svg`, `${S146}/ellipse-4.svg`, `${S146}/ellipse-6.svg`] as const;

/** Garnish dots per food (v1 Figma 9.6 "Ellipse"s, five per plate) */
const GARNISH: readonly (readonly string[])[] = [
  [`${S146}/ellipse-2.svg`, `${S146}/ellipse-3.svg`, `${S146}/ellipse-2.svg`, `${S146}/ellipse-3.svg`, `${S146}/ellipse-3.svg`],
  [`${S146}/ellipse-3.svg`, `${S146}/ellipse-5.svg`, `${S146}/ellipse-3.svg`, `${S146}/ellipse-5.svg`, `${S146}/ellipse-5.svg`],
  [`${S146}/ellipse-7.svg`, `${S146}/ellipse-3.svg`, `${S146}/ellipse-7.svg`, `${S146}/ellipse-3.svg`, `${S146}/ellipse-3.svg`],
];
const GARNISH_AT = [
  [57.99, 45.94],
  [87.48, 55.52],
  [70.52, 73.95],
  [88.95, 75.43],
  [55.78, 68.06],
] as const;

/** Popular card tints behind the illustrated plates (curry, salmon, pasta) */
const CARD_TINTS = ["bg-[#fcebd2]", "bg-flame-soft", "bg-butter-soft"] as const;

/** Illustrated discs/tiles (no-photo fallback), by slot */
const ART = {
  /** "Recently made" 100px discs */
  recent: [`${S146}/photo-beef.svg`, `${S146}/photo-salmon.svg`, `${S146}/photo-salad.svg`],
  /** "Similar" 60px thumbs */
  thumb: [`${S148}/photo-bowl-1.svg`, `${S148}/photo-steak-1.svg`, `${S148}/photo-broc-1.svg`],
  /** "Cuts" 32px discs */
  cut: [`${S148}/photo-beef.svg`, `${S148}/photo-steak.svg`, `${S148}/photo-curry.svg`, `${S148}/photo-bowl.svg`],
  /** "Combinations": the query ingredient's 52px disc */
  comboAnchor: [`${S148}/photo-beef-1.svg`],
  /** "Combinations": the partner's 52px disc (white 3px ring, overlapping) */
  comboPair: [`${S148}/photo-broc.svg`, `${S148}/photo-rice.svg`, `${S148}/photo-potato.svg`],
} as const;

export type ArtSlot = keyof typeof ART;

/** False for missing images and the catalog's generic placeholder */
export function hasPhoto(src?: string | null): src is string {
  return Boolean(src) && !/placeholder-dish/.test(src as string);
}

function pick<T>(list: readonly T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length];
}

/**
 * A photo in a disc (`shape="round"`, Figma radius = size / 2) or a radius-14 thumb
 * (`shape="thumb"`), `size` px, object-cover. `ring` = the white 3px outline of the
 * overlapping Combinations disc (the photo sits inside it, like the design).
 * `index` picks the illustration used when there is no photo.
 */
export function Plate({
  slot,
  index = 0,
  size,
  src,
  shape = "round",
  ring,
  className,
}: {
  slot: ArtSlot;
  index?: number;
  size: number;
  /** Recipe or ingredient photo */
  src?: string | null;
  shape?: "round" | "thumb";
  ring?: boolean;
  className?: string;
}) {
  const art = pick<string>(ART[slot], index);
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden",
        shape === "round" ? "rounded-full" : "rounded-thumb",
        ring && "border-[3px] border-surface bg-surface",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {hasPhoto(src) ? (
        <SmartImage src={src} alt="" fallback={art} className="size-full" />
      ) : (
        <img src={art} alt="" width={size} height={size} className="block size-full max-w-none" />
      )}
    </span>
  );
}

/**
 * The 158x128 "Most popular" tile (Figma "photo/tikka": radius 18, photo full-bleed).
 * Without a photo it is the v1 curry / salmon / pasta plate illustration.
 */
export function PlateCard({ index = 0, src, className }: { index?: number; src?: string | null; className?: string }) {
  if (hasPhoto(src)) {
    return <SmartImage src={src} alt="" className={cn("h-[128px] w-[158px] shrink-0 rounded-tile", className)} />;
  }
  const variant = ((index % 3) + 3) % 3;
  return (
    <span className={cn("relative block h-[128px] w-[158px] shrink-0 overflow-hidden rounded-tile", CARD_TINTS[variant], className)}>
      <span aria-hidden className="absolute left-[27.8px] top-[12.8px] size-[102.4px]">
        <span className="absolute inset-[-4.88%_-7.81%_-10.74%_-7.81%]">
          <img src={PLATE} alt="" className="block size-full max-w-none" />
        </span>
      </span>
      <img src={FOOD[variant]} alt="" className="absolute left-[42.14px] top-[27.14px] block size-[73.728px] max-w-none" />
      {GARNISH_AT.map(([left, top], i) => (
        <img key={i} src={GARNISH[variant][i]} alt="" className="absolute block size-[9.585px] max-w-none" style={{ left, top }} />
      ))}
    </span>
  );
}
