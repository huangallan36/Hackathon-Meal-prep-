"use client";

import { Flame, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect } from "react";
import { IconButton } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/Misc";
import type { SocialPost, SocialUser } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";
import { AuthorLink } from "./AuthorLink";
import { CookThisButton } from "./CookThisButton";

/**
 * Post detail bottom sheet: photo, dish, caption, a Yum toggle and "Cook this".
 * Closes on backdrop tap, the X, Escape, or dragging the handle down.
 */
export function PostSheet({
  post,
  author,
  upvotes,
  upvoted,
  onToggleUpvote,
  onClose,
}: {
  /** null = closed */
  post: SocialPost | null;
  author?: SocialUser;
  upvotes: number;
  upvoted: boolean;
  onToggleUpvote: () => void;
  onClose: () => void;
}) {
  const controls = useDragControls();
  const open = post != null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  }

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          key="backdrop"
          aria-hidden
          className="fixed inset-0 z-[55] bg-ink/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}
      {post && (
        <motion.div
          key="sheet"
          role="dialog"
          aria-modal="true"
          aria-label={post.dishName}
          className="fixed inset-x-0 bottom-0 z-[56] flex max-h-[90%] flex-col rounded-t-[28px] bg-surface shadow-lift"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          drag="y"
          dragListener={false}
          dragControls={controls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={handleDragEnd}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing"
            onPointerDown={(e) => controls.start(e)}
          >
            <span className="h-1.5 w-11 rounded-full bg-line" />
          </div>

          <div className="no-scrollbar overflow-y-auto px-5 pb-[calc(var(--safe-bottom)+24px)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-cream-deep shadow-card">
              <SmartImage src={post.image} alt={post.dishName} className="size-full" />
              <IconButton label="Close" onClick={onClose} autoFocus className="absolute right-3 top-3 bg-surface/90 backdrop-blur">
                <X className="size-5" />
              </IconButton>
            </div>

            <h2 className="mt-4 text-balance font-display text-2xl font-semibold leading-tight text-ink">{post.dishName}</h2>
            <AuthorLink handle={post.author} user={author} createdAt={post.createdAt} onClick={onClose} className="mt-1.5" />
            {post.caption && <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{post.caption}</p>}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleUpvote}
                aria-pressed={upvoted}
                aria-label={upvoted ? `Yummed (${upvotes} yums). Tap to undo` : `Yum this dish (${upvotes} yums)`}
                className={cn(
                  "inline-flex h-12 shrink-0 items-center gap-2 rounded-pill px-5 font-semibold tabular-nums transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  upvoted ? "bg-accent-soft text-accent-strong" : "bg-surface text-ink shadow-card hover:bg-cream-deep",
                )}
              >
                <motion.span key={upvoted ? "on" : "off"} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="inline-flex">
                  <Flame className="size-5 text-accent" fill={upvoted ? "currentColor" : "none"} strokeWidth={2.2} />
                </motion.span>
                {formatCount(upvotes)}
              </button>
              <CookThisButton recipeId={post.recipeId} size="md" className="h-12 flex-1" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
