import { cn } from "@/lib/utils";

/**
 * Figma icon assets reused on the Social screens. The Figma file has no Social frames,
 * so these come from the screens where the same icon appears (flame from 3.4 diary
 * calendar / shared icons, sparkle from 2.1 planner, plus + share from 2.4 groceries).
 */
const ICONS = {
  /** Orange flame, 16px (3.4 "12-day logging streak") */
  flame16: { src: "/figma/screens/2-161/icon-flame.svg", size: 16 },
  /** Orange flame, 18px (shared icon) */
  flame18: { src: "/figma/icons/flame.svg", size: 18 },
  /** Green sparkle, 12px (2.1 "Tuned to you" pill) */
  sparkle12: { src: "/figma/screens/2-146/icon-sparkle.svg", size: 12 },
  /** Green plus, 16px (2.4 "Add item") */
  plus16: { src: "/figma/screens/2-152/icon-plus.svg", size: 16 },
  /** Ink share arrow, 18px (2.4 header button) */
  share18: { src: "/figma/screens/2-152/icon-share.svg", size: 18 },
} as const;

export type FigmaIconName = keyof typeof ICONS;

/** A Figma SVG icon at its native size (never recolored or stretched) */
export function FigmaIcon({ name, className }: { name: FigmaIconName; className?: string }) {
  const icon = ICONS[name];
  return (
    <img
      src={icon.src}
      alt=""
      aria-hidden
      width={icon.size}
      height={icon.size}
      draggable={false}
      className={cn("block shrink-0", className)}
      style={{ width: icon.size, height: icon.size }}
    />
  );
}
