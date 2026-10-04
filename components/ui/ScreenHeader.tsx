"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./Button";

/**
 * Sticky screen header. `back` = true uses history; a string navigates to that path.
 */
export function ScreenHeader({
  title,
  subtitle,
  back,
  right,
  className,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 bg-cream/85 px-4 pb-3 pt-[calc(var(--safe-top)+14px)] backdrop-blur-md",
        className,
      )}
    >
      {back && (
        <IconButton
          label="Back"
          onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        {title && <h1 className="truncate font-display text-[22px] font-semibold leading-tight text-ink">{title}</h1>}
        {subtitle && <p className="truncate text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
