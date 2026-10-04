import { cn, formatCount } from "@/lib/utils";
import { FigmaIcon } from "./FigmaIcon";

/**
 * Orange flame + upvote count ("Yums"). Styled like the Figma photo-card overlay
 * buttons (2.1: white 90% on the photo); a flame-soft fill marks dishes you Yummed.
 */
export function UpvotePill({
  count,
  size = "md",
  active,
  onPhoto = true,
  className,
}: {
  count: number;
  size?: "sm" | "md";
  /** The viewer has upvoted this post */
  active?: boolean;
  /** Sits on a photo (translucent white) instead of a white surface (1px line) */
  onPhoto?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill font-semibold tabular-nums",
        size === "sm" ? "h-6 gap-1 pl-1 pr-2 text-xs" : "h-[30px] gap-1 pl-1.5 pr-2.5 text-meta",
        active ? "bg-flame-soft text-flame" : onPhoto ? "bg-surface/90 text-ink" : "bg-surface text-ink shadow-card",
        className,
      )}
      aria-label={`${count} yums${active ? ", including yours" : ""}`}
    >
      <FigmaIcon name={size === "sm" ? "flame16" : "flame18"} />
      {formatCount(count)}
    </span>
  );
}
