"use client";

import type { ReactNode } from "react";
import { SectionHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Figma planner section: Fraunces 18 title with a green "See all" on the right, 12px above
 * its content, 22px below the previous section. "See all" toggles the section open in place
 * ("Show less"); it only shows when there is more to see.
 */
export function PlannerSection({
  id,
  title,
  expanded,
  onToggle,
  action,
  gap = "mt-3",
  children,
  className,
}: {
  id?: string;
  title: string;
  expanded?: boolean;
  /** Shows "See all" / "Show less" */
  onToggle?: () => void;
  /** Custom right-side content (instead of See all) */
  action?: ReactNode;
  /** Space between the header and the content (Figma: 12, the Similar list 10) */
  gap?: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("px-5 pt-[22px] animate-fade-up", className)}>
      <SectionHeader
        title={title}
        className="leading-[normal] [&>h2]:min-w-0 [&>h2]:truncate"
        action={
          action ??
          (onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={id ? `${id}-content` : undefined}
              className="-my-2 -mr-2 shrink-0 rounded-pill px-2 py-2 text-meta font-semibold leading-[normal] text-accent transition hover:text-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {expanded ? "Show less" : "See all"}
            </button>
          ) : undefined)
        }
      />
      <div id={id ? `${id}-content` : undefined} className={gap}>
        {children}
      </div>
    </section>
  );
}

/**
 * Sideways scroller that bleeds into the page gutters, so cards slide under the screen edge
 * like the design. With `wrap` it lays the same items out in rows instead ("See all").
 */
export function Scroller({
  children,
  label,
  wrap,
  gap = "gap-3",
  className,
}: {
  children: ReactNode;
  label?: string;
  wrap?: boolean;
  gap?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        wrap
          ? "flex flex-wrap gap-y-4"
          : "no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 overflow-x-auto overscroll-x-contain px-5",
        gap,
        className,
      )}
    >
      {children}
      {/* Trailing spacer: keeps the last card's right gutter (padding-right is ignored in flex overflow) */}
      {!wrap && <span aria-hidden className="w-2 shrink-0" />}
    </div>
  );
}
