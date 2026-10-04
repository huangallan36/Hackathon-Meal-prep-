import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface p-4 shadow-card", className)} {...rest} />;
}

/** Small uppercase label above a section */
export function SectionLabel({ className, ...rest }: ComponentProps<"h2">) {
  return <h2 className={cn("text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft", className)} {...rest} />;
}

/** Figma section header: Fraunces 18 title, optional right-aligned link ("See all", "Map") */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="font-display text-section font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
