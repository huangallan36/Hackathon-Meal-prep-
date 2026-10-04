"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";

const VALID_ID = /^[\w-]{6,20}$/;

/**
 * Figma 2.3 tutorial card: white, radius 16, a 96x64 dark thumbnail with the play button,
 * "TUTORIAL" (10 Bold flame), the title and a meta line.
 *
 * YouTube policy: the thumbnail is our own card, never a fake player. With a known video,
 * tapping it opens the real (privacy-enhanced) embed below the card: 16:9, at least 200px
 * tall, nothing layered on top. Without one it opens YouTube's search for the recipe.
 */
export function TutorialCard({ recipe, className }: { recipe: Pick<Recipe, "title" | "youtubeId">; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const videoId = recipe.youtubeId && VALID_ID.test(recipe.youtubeId) ? recipe.youtubeId : null;
  const title = `How to make ${recipe.title}`;

  const body = (
    <>
      <span className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-linear-to-b from-[#3e4f45] to-[#1d2722]">
        <span className="flex size-7 items-center justify-center rounded-full bg-white/92">
          <img src={COOK_ICON.play} alt="" width={14} height={14} className="block size-3.5" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[normal]">
        <span className="text-micro font-bold tracking-[0.8px] text-flame">TUTORIAL</span>
        <span className="truncate text-sm font-semibold text-ink">{title}</span>
        <span className="truncate text-xs text-ink-soft">
          {videoId ? (open ? "Playing below · tap to hide" : "Video · plays right here") : "YouTube · opens in a new tab"}
        </span>
      </span>
    </>
  );

  const cardClass = cn(
    "flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface py-2 pl-2 pr-3 text-left transition active:scale-[0.99] hover:bg-cream",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  );

  if (!videoId) {
    const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recipe.title} recipe`)}`;
    return (
      <a
        href={search}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}: search YouTube (opens in a new tab)`}
        className={cn(cardClass, className)}
      >
        {body}
      </a>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1`;
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-video`} onClick={() => setOpen((o) => !o)} className={cardClass}>
        {body}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-video`}
            key="video"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="aspect-video min-h-[200px] w-full min-w-[200px] overflow-hidden rounded-[16px] bg-ink">
              <iframe
                src={src}
                title={`${recipe.title}: video tutorial`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="block size-full border-0"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
