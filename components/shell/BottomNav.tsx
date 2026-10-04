"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS, tabFor } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Figma "Tab Bar" (2:131): Planner | Home | Diary | Me. The active tab gets a
 * green-tinted pill behind its icon and a green SemiBold label.
 * Icons are the exported Figma assets (active + inactive variants).
 */
export function BottomNav() {
  const active = tabFor(usePathname());

  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[var(--safe-bottom)]"
    >
      <div className="flex h-[var(--nav-height)] items-start overflow-hidden px-3 pt-2.5">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="flex min-w-px flex-1 flex-col items-center gap-1 rounded-tile outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span
                className={cn(
                  "flex items-start py-1 transition-[background-color,padding] duration-200",
                  isActive && "rounded-pill bg-accent-soft px-4",
                )}
              >
                <img
                  src={`/figma/tabbar/${tab.key}${isActive ? "-active" : ""}.svg`}
                  alt=""
                  width={22}
                  height={22}
                  className="block size-[22px]"
                />
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[11px] leading-normal",
                  isActive ? "font-semibold text-accent" : "font-medium text-ink-faint",
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
