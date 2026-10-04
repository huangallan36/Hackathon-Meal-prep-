"use client";

/**
 * The Figma planner's food art: a tinted disc (or rounded tile / card) holding a white plate
 * with food on it. The food is data: a real recipe or ingredient photo sits in the food circle.
 * When there is no real photo yet (catalog placeholder), the design's own illustration is shown
 * instead, so the screen still reads like the design.
 */
import { SmartImage } from "@/components/ui/Misc";
import { cn } from "@/lib/utils";

const S146 = "/figma/screens/2-146";
const S148 = "/figma/screens/2-148";

/** White plate with its soft shadow (Figma "Ellipse" 102.4, drawn 118.4 to fit the shadow) */
const PLATE = `${S146}/ellipse.svg`;

/** Food circles (Figma 73.7 "Ellipse" gradients): curry, salmon, pasta. Also the photo fallback. */
export const FOOD = [`${S146}/ellipse-1.svg`, `${S146}/ellipse-4.svg`, `${S146}/ellipse-6.svg`] as const;

/** Garnish dots per food (Figma 9.6 "Ellipse"s, five per plate) */
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

/** Popular card tints (Figma photo/curry, photo/salmon, photo/pasta) */
const CARD_TINTS = ["bg-[#fcebd2]", "bg-flame-soft", "bg-butter-soft"] as const;

/** Full illustrated discs/tiles from the design, by slot, with the tint each one uses */
export const ART = {
  /** "Recently made" 100px plates */
  recent: [
    { src: `${S146}/photo-beef.svg`, tint: "bg-butter-soft" },
    { src: `${S146}/photo-salmon.svg`, tint: "bg-flame-soft" },
    { src: `${S146}/photo-salad.svg`, tint: "bg-accent-soft" },
  ],
  /** "Similar" 60px thumbs */
  thumb: [
    { src: `${S148}/photo-bowl-1.svg`, tint: "bg-[#e3ecf6]" },
    { src: `${S148}/photo-steak-1.svg`, tint: "bg-[#f3e4dc]" },
    { src: `${S148}/photo-broc-1.svg`, tint: "bg-accent-soft" },
  ],
  /** "Cuts & ingredients" 32px discs */
  cut: [
    { src: `${S148}/photo-beef.svg`, tint: "bg-butter-soft" },
    { src: `${S148}/photo-steak.svg`, tint: "bg-[#f3e4dc]" },
    { src: `${S148}/photo-curry.svg`, tint: "bg-[#fcebd2]" },
    { src: `${S148}/photo-bowl.svg`, tint: "bg-[#e3ecf6]" },
  ],
  /** "Combinations": the query ingredient's 52px plate */
  comboAnchor: [{ src: `${S148}/photo-beef-1.svg`, tint: "bg-butter-soft" }],
  /** "Combinations": the partner's 52px plate (white 3px ring, overlapping) */
  comboPair: [
    { src: `${S148}/photo-broc.svg`, tint: "bg-accent-soft" },
    { src: `${S148}/photo-rice.svg`, tint: "bg-[#f4f1ea]" },
    { src: `${S148}/photo-potato.svg`, tint: "bg-butter-soft" },
  ],
} as const;

export type ArtSlot = keyof typeof ART;

/** False for missing images and the catalog's generic placeholder */
export function hasPhoto(src?: string | null): src is string {
  return Boolean(src) && !/placeholder-dish/.test(src as string);
}

function pick<T>(list: readonly T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length];
}

/** The white plate, centred in its parent, `size` px across */
function PlateBase({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-1/2"
      style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}
    >
      <span className="absolute inset-[-4.88%_-7.81%_-10.74%_-7.81%]">
        <img src={PLATE} alt="" className="block size-full max-w-none" />
      </span>
    </span>
  );
}

/**
 * A plate in a tinted disc (`shape="round"`) or rounded tile (`shape="thumb"`), `size` px.
 * `index` picks the design variant (tint + illustration) for this slot.
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
  /** White 3px outline (overlapping combination plates) */
  ring?: boolean;
  className?: string;
}) {
  const art = pick<{ src: string; tint: string }>(ART[slot], index);
  if (!hasPhoto(src)) {
    return (
      <img
        src={art.src}
        alt=""
        width={size}
        height={size}
        className={cn("block shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const food = size * 0.576;
  return (
    <span
      className={cn("relative block shrink-0 overflow-hidden", shape === "round" ? "rounded-full" : "rounded-thumb", art.tint, className)}
      style={{ width: size, height: size }}
    >
      <PlateBase size={size * 0.8} />
      <span
        className="absolute left-1/2 top-1/2 overflow-hidden rounded-full"
        style={{ width: food, height: food, marginLeft: -food / 2, marginTop: -food / 2 }}
      >
        <SmartImage src={src} alt="" fallback={pick(FOOD, index)} className="size-full rounded-full" />
      </span>
      {ring && <span aria-hidden className="absolute inset-0 rounded-full border-[3px] border-surface" />}
    </span>
  );
}

/**
 * The 158x128 "Most popular" card art: tinted tile, plate, and the recipe photo as the food.
 * Without a photo it is the design's curry / salmon / pasta illustration.
 */
export function PlateCard({ index = 0, src, className }: { index?: number; src?: string | null; className?: string }) {
  const variant = ((index % 3) + 3) % 3;
  return (
    <span className={cn("relative block h-[128px] w-[158px] shrink-0 overflow-hidden rounded-tile", CARD_TINTS[variant], className)}>
      <span aria-hidden className="absolute left-[27.8px] top-[12.8px] size-[102.4px]">
        <span className="absolute inset-[-4.88%_-7.81%_-10.74%_-7.81%]">
          <img src={PLATE} alt="" className="block size-full max-w-none" />
        </span>
      </span>
      {hasPhoto(src) ? (
        <span className="absolute left-[42.14px] top-[27.14px] size-[73.728px] overflow-hidden rounded-full">
          <SmartImage src={src} alt="" fallback={FOOD[variant]} className="size-full rounded-full" />
        </span>
      ) : (
        <>
          <img src={FOOD[variant]} alt="" className="absolute left-[42.14px] top-[27.14px] block size-[73.728px] max-w-none" />
          {GARNISH_AT.map(([left, top], i) => (
            <img
              key={i}
              src={GARNISH[variant][i]}
              alt=""
              className="absolute block size-[9.585px] max-w-none"
              style={{ left, top }}
            />
          ))}
        </>
      )}
    </span>
  );
}
