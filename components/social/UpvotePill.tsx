import { Flame } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

type Tone = "glass" | "light" | "plain";

const tones: Record<Tone, string> = {
  /** On photos */
  glass: "bg-ink/45 text-white backdrop-blur-md",
  /** On white surfaces */
  light: "bg-accent-soft text-accent-strong",
  plain: "text-ink-soft",
};

/** Flame + upvote count ("Yums") */
export function UpvotePill({
  count,
  tone = "glass",
  size = "md",
  active,
  className,
}: {
  count: number;
  tone?: Tone;
  size?: "sm" | "md";
  /** The viewer has upvoted this post */
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-semibold tabular-nums",
        size === "sm" ? "h-6 px-2 text-[11px]" : "h-8 px-3 text-sm",
        tones[tone],
        className,
      )}
      aria-label={`${count} yums`}
    >
      <Flame
        className={cn(size === "sm" ? "size-3" : "size-4", active || tone !== "plain" ? "text-accent" : "")}
        fill={active ? "currentColor" : "none"}
        strokeWidth={2.4}
      />
      {formatCount(count)}
    </span>
  );
}
