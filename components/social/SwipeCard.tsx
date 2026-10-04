"use client";

import { animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useEffect, useImperativeHandle, useRef, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import { SmartImage } from "@/components/ui/Misc";
import type { SocialPost, SocialUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AuthorLink } from "./AuthorLink";
import { CookThisButton } from "./CookThisButton";
import { UpvotePill } from "./UpvotePill";

export type SwipeDir = "left" | "right";

export interface SwipeCardHandle {
  /** Throw the card off screen (buttons, keyboard), then report the decision */
  fling: (dir: SwipeDir) => void;
}

/** Offset (px) plus a share of release velocity needed to count as a swipe */
const SWIPE_THRESHOLD = 100;
const FLY_OUT_PX = 540;
const SPRING_BACK = { type: "spring", stiffness: 480, damping: 30 } as const;

/**
 * One post in the swipe stack. Only the top card (depth 0) is draggable; the next
 * two peek out behind it, scaled down. Right = Yum (upvote), left = skip.
 * Styled as a Figma card: the real post photo on top, a white info panel below.
 */
export function SwipeCard({
  post,
  author,
  upvotes,
  depth,
  returnFrom,
  onDecide,
  ref,
}: {
  post: SocialPost;
  author?: SocialUser;
  upvotes: number;
  depth: number;
  /** Set when an undo brings this card back: it flies in from the side it left by */
  returnFrom?: SwipeDir;
  onDecide: (postId: string, dir: SwipeDir) => void;
  ref?: Ref<SwipeCardHandle>;
}) {
  const isTop = depth === 0;
  const x = useMotionValue(returnFrom === "right" ? FLY_OUT_PX : returnFrom === "left" ? -FLY_OUT_PX : 0);
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16]);
  const yumOpacity = useTransform(x, [24, SWIPE_THRESHOLD], [0, 1]);
  const yumScale = useTransform(x, [24, SWIPE_THRESHOLD], [0.85, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0]);
  const skipScale = useTransform(x, [-SWIPE_THRESHOLD, -24], [1, 0.85]);
  const controls = useDragControls();
  const leaving = useRef(false);

  function fling(dir: SwipeDir) {
    if (leaving.current) return;
    leaving.current = true;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    animate(x, dir === "right" ? FLY_OUT_PX : -FLY_OUT_PX, {
      duration: 0.32,
      ease: [0.32, 0.72, 0.35, 1],
      onComplete: () => onDecide(post.id, dir),
    });
  }

  useImperativeHandle(ref, () => ({ fling }));

  // Undo: glide back to the center from wherever the card was thrown.
  useEffect(() => {
    if (x.get() === 0) return;
    const glide = animate(x, 0, SPRING_BACK);
    return () => glide.stop();
  }, [x]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power > SWIPE_THRESHOLD) fling("right");
    else if (power < -SWIPE_THRESHOLD) fling("left");
    else animate(x, 0, SPRING_BACK);
  }

  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    if (!isTop || leaving.current) return;
    if (e.target instanceof Element && e.target.closest("[data-no-drag]")) return;
    controls.start(e);
  }

  return (
    <motion.article
      aria-label={isTop ? `${post.dishName} by ${author?.name ?? post.author}` : undefined}
      aria-hidden={!isTop}
      inert={!isTop}
      className={cn("absolute inset-0 select-none", isTop && "cursor-grab active:cursor-grabbing")}
      style={{ x, rotate, zIndex: 10 - depth, touchAction: "pan-y" }}
      initial={returnFrom ? false : { scale: 0.86, y: 46, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 22, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag={isTop ? "x" : false}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={startDrag}
    >
      {/* Figma card: white, radius 22, 1px line, flat. Photo on top, info panel below. */}
      <div className="flex size-full flex-col overflow-hidden rounded-card bg-surface shadow-card">
        <div className="relative min-h-0 flex-1 bg-cream-deep [&_img]:pointer-events-none">
          <div className="absolute inset-0">
            <SmartImage src={post.image} alt={post.dishName} className="size-full" />
          </div>

          {/* Like the white overlay buttons on the Figma photo cards (2.1) */}
          <UpvotePill count={upvotes} className="absolute left-3 top-3" />

          {/* Swipe stamps fade in with the drag */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.span
              style={{ opacity: yumOpacity, scale: yumScale }}
              className="absolute -rotate-6 rounded-tile border-2 border-accent bg-surface/95 px-5 py-1.5 font-display text-title font-semibold text-accent"
            >
              Yum!
            </motion.span>
            <motion.span
              style={{ opacity: skipOpacity, scale: skipScale }}
              className="absolute rotate-6 rounded-tile border-2 border-ink-soft bg-surface/95 px-5 py-1.5 font-display text-title font-semibold text-ink-soft"
            >
              Skip
            </motion.span>
          </div>
        </div>

        <div className="shrink-0 border-t border-line px-4 pb-3 pt-3.5">
          <h2 className="line-clamp-2 text-balance font-display text-heading font-semibold leading-[1.15] text-ink">
            {post.dishName}
          </h2>
          {post.caption && <p className="mt-1 line-clamp-2 text-meta leading-snug text-ink-soft">{post.caption}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <AuthorLink handle={post.author} user={author} createdAt={post.createdAt} size="sm" className="-ml-0.5" />
            <CookThisButton recipeId={post.recipeId} />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
