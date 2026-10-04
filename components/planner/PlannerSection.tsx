"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial section: Fraunces title, quiet subtitle, optional "See all" / "Show less" toggle.
 */
export function PlannerSection({
  id,
  title,
  subtitle,
  total,
  expanded,
  onToggle,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  /** Total items; with onToggle shows "See all {total}" */
  total?: number;
  expanded?: boolean;
  onToggle?: () => void;
  /** Custom right-side action (instead of See all) */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("mt-10 animate-fade-up", className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {action}
        {!action && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="-mr-2 inline-flex h-11 shrink-0 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-accent-strong transition hover:bg-accent-soft active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {expanded ? "Show less" : total ? `See all ${total}` : "See all"}
            <ChevronDown className={cn("size-4 transition-transform duration-300", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Edge-to-edge horizontal scroller with scroll-snap. Bleeds into the page gutters so cards
 * scroll under the screen edge, and pads vertically so card shadows aren't clipped.
 */
export function Scroller({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-5 -my-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 py-3",
        className,
      )}
    >
      {children}
      {/* Trailing spacer: keeps the last card's right gutter (padding-right is ignored in flex overflow) */}
      <span aria-hidden className="w-0 shrink-0" />
    </div>
  );
}
