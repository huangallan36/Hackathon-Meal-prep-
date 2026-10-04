"use client";

import { animate, motion, useDragControls, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useImperativeHandle, useRef, type PointerEvent as ReactPointerEvent, type Ref } from "react";
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

/**
 * One post in the swipe stack. Only the top card (depth 0) is draggable; the next
 * two peek out behind it, scaled down. Right = Yum (upvote), left = skip.
 */
export function SwipeCard({
  post,
  author,
  upvotes,
  depth,
  onDecide,
  ref,
}: {
  post: SocialPost;
  author?: SocialUser;
  upvotes: number;
  depth: number;
  onDecide: (postId: string, dir: SwipeDir) => void;
  ref?: Ref<SwipeCardHandle>;
}) {
  const isTop = depth === 0;
  const x = useMotionValue(0);
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

  function handleDragEnd(_: unknown, info: PanInfo) {
    const power = info.offset.x + info.velocity.x * 0.2;
    if (power > SWIPE_THRESHOLD) fling("right");
    else if (power < -SWIPE_THRESHOLD) fling("left");
    else animate(x, 0, { type: "spring", stiffness: 480, damping: 30 });
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
      initial={{ scale: 0.86, y: 46, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 22, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      drag={isTop ? "x" : false}
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={startDrag}
    >
      <div
        className={cn(
          "relative size-full overflow-hidden rounded-[28px] bg-cream-deep",
          isTop ? "shadow-lift" : "shadow-card",
        )}
      >
        <div className="absolute inset-0 [&_img]:pointer-events-none">
          <SmartImage src={post.image} alt={post.dishName} className="size-full" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-ink/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[64%] bg-linear-to-t from-ink/95 via-ink/55 to-transparent" />

        {/* Swipe stamps fade in with the drag */}
        <motion.span
          style={{ opacity: yumOpacity, scale: yumScale }}
          className="pointer-events-none absolute left-5 top-7 -rotate-12 rounded-tile border-[3px] border-herb bg-herb-soft/95 px-4 py-1 font-display text-[30px] font-bold uppercase tracking-wide text-herb shadow-soft"
        >
          Yum!
        </motion.span>
        <motion.span
          style={{ opacity: skipOpacity, scale: skipScale }}
          className="pointer-events-none absolute right-5 top-7 rotate-12 rounded-tile border-[3px] border-ink-soft bg-surface/90 px-4 py-1 font-display text-[30px] font-bold uppercase tracking-wide text-ink-soft shadow-soft"
        >
          Skip
        </motion.span>

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-5">
          <AuthorLink handle={post.author} user={author} createdAt={post.createdAt} tone="light" className="-ml-0.5 self-start" />
          <h2 className="line-clamp-2 text-balance font-display text-[27px] font-semibold leading-[1.08] text-white">
            {post.dishName}
          </h2>
          {post.caption && <p className="line-clamp-2 text-[15px] leading-snug text-white/85">{post.caption}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <UpvotePill count={upvotes} />
            <CookThisButton recipeId={post.recipeId} size="md" className="h-11" />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
