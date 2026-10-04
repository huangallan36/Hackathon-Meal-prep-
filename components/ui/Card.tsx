import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface p-4 shadow-card", className)} {...rest} />;
}

/** Small uppercase label above a section */
export function SectionLabel({ className, ...rest }: ComponentProps<"h2">) {
  return <h2 className={cn("text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint", className)} {...rest} />;
}

/** Section header with optional right-aligned action ("See all") */
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
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
