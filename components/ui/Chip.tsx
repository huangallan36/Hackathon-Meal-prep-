"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "selected" | "accent" | "herb" | "butter" | "flame";

/** Figma chips: white with a 1px line; selected = ink fill; tinted tones for status/macros */
const tones: Record<Tone, string> = {
  neutral: "bg-surface text-ink border border-line",
  selected: "bg-ink text-white",
  accent: "bg-accent-soft text-accent",
  herb: "bg-herb-soft text-herb",
  butter: "bg-butter-soft text-butter-ink",
  flame: "bg-flame-soft text-flame",
};

export function Chip({
  children,
  tone = "neutral",
  icon,
  onRemove,
  onClick,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-[7px] text-meta font-medium animate-pop",
        tones[tone],
        onClick && "active:scale-95 transition",
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${typeof children === "string" ? children : "item"}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onRemove();
            }
          }}
          className="-mr-1 ml-0.5 inline-flex size-5 items-center justify-center rounded-full hover:bg-black/5"
        >
          <X className="size-3.5" />
        </span>
      )}
    </Tag>
  );
}
