"use client";

import { IconLink } from "@/components/ui/Button";

/**
 * Header back button of Figma 3.2 / 3.4 (and the diary's broken-link page): the 40px white
 * circle with the screen's own 20px "icon/chevL". Goes to `href` (for ScreenHeader's `left` slot).
 */
export function BackLink({ href, icon, label = "Back" }: { href: string; icon: string; label?: string }) {
  return (
    <IconLink href={href} label={label}>
      <img src={icon} alt="" width={20} height={20} className="block size-5" />
    </IconLink>
  );
}
