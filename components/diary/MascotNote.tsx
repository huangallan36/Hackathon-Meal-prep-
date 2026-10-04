"use client";

import type { ReactNode } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/voice/persona";

/**
 * The chosen sous-chef saying one line inside a card (design rules v1: mascots show up in
 * empty states and celebrations, never on the data itself): its MascotAvatar beside DM Sans
 * Medium 13. Figma 3.3 empty dinner: 36px round avatar, ink-soft text. Figma 3.4 streak:
 * `square` = the 30px avatar with 8px corners, avocado text.
 */
export function MascotNote({
  children,
  size = 36,
  square,
  className,
  textClassName = "text-ink-soft",
}: {
  children: ReactNode;
  size?: number;
  square?: boolean;
  className?: string;
  /** Text color utility */
  textClassName?: string;
}) {
  const persona = usePersona();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <MascotAvatar persona={persona} size={size} className={square ? "rounded-[8px]!" : undefined} />
      <p className={cn("min-w-0 flex-1 text-meta font-medium leading-[normal]", textClassName)}>{children}</p>
    </div>
  );
}
