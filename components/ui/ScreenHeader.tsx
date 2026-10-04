"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

/**
 * Figma header bar (2.3, 2.4, 3.2–3.4): a 40px white circle back button on the left,
 * an optional right button, and an optional centred title (Fraunces 17) with a small
 * eyebrow above or a subtitle below. Large left-aligned page titles are separate
 * (see PageTitle) and sit under this bar.
 * `back` = true uses history; a string navigates to that path.
 */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  back,
  right,
  className,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 grid grid-cols-[minmax(40px,auto)_1fr_minmax(40px,auto)] items-center gap-3 bg-cream/90 px-5 pb-2 pt-[calc(var(--safe-top)+6px)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex">
        {back && (
          <IconButton label="Back" onClick={() => (typeof back === "string" ? router.push(back) : router.back())}>
            <img src="/figma/icons/chevron-left.svg" alt="" width={20} height={20} className="block size-5" />
          </IconButton>
        )}
      </div>
      <div className="min-w-0 text-center">
        {eyebrow && <p className="truncate text-xs font-medium tracking-[0.06em] text-ink-soft">{eyebrow}</p>}
        {title && <h1 className="truncate font-display text-lead font-semibold leading-tight text-ink">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-ink-soft">{subtitle}</p>}
      </div>
      <div className="flex justify-end">{right}</div>
    </header>
  );
}

/** Figma large page title ("Meal planner", "Groceries"): Fraunces 30 with an optional line below */
export function PageTitle({
  title,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5", className)}>
      <h1 className="font-display text-title font-semibold leading-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
    </div>
  );
}
