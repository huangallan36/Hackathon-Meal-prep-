"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import videoSteps from "@/data/video-steps.json";
import type { StepTutorial } from "@/lib/cooking/tutorial";
import { useVideo } from "@/lib/stores/video";
import { useVoice } from "@/lib/stores/voice";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";

const VALID_ID = /^[\w-]{6,20}$/;

/** Where each catalog recipe's steps start in its video (scripts/gen-video-steps.mjs) */
const STEP_TIMES = videoSteps as Record<string, (number | null)[] | undefined>;

/**
 * Seconds into the recipe video where `step` starts: its own time, else the latest earlier
 * step's, else 0. null when we have no times for this recipe (play from the start as before).
 */
function videoStartFor(recipeId: number | string, step: number | undefined): number | null {
  const times = STEP_TIMES[String(recipeId)];
  if (!times || step == null || step < 0) return null;
  for (let i = Math.min(step, times.length - 1); i >= 0; i--) {
    const t = times[i];
    if (typeof t === "number") return t;
  }
  return 0;
}

const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

const youtubeSearch = (query: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

/**
 * Figma 2.3 tutorial card: white, 1px line, radius 16, a 96x64 dark thumbnail (radius 10) with
 * the 28px play button, "TUTORIAL" (10 Bold tomato, 0.8px tracking), the title (14 SemiBold)
 * and a meta line (12, ink-soft).
 *
 * With a known recipe video, tapping the card (or saying "show me the video", see useVideo)
 * plays the real privacy-enhanced YouTube embed right below it, inside the app: 16:9, at least
 * 200px tall, nothing layered on top. The card is our own thumbnail, never a fake player. When
 * the step has a technique ("How to dice an onion") the card keeps that title and plays the
 * recipe's video. Without a video it opens YouTube's search in a new tab.
 */
export function TutorialCard({
  recipe,
  tutorial,
  stepIndex,
  className,
}: {
  recipe: Pick<Recipe, "id" | "title" | "youtubeId">;
  /** The current step's technique, when it has one */
  tutorial?: StepTutorial | null;
  /** 0-based current step: the video starts where this step happens, when we know it */
  stepIndex?: number;
  className?: string;
}) {
  const id = useId();
  const videoId = recipe.youtubeId && VALID_ID.test(recipe.youtubeId) ? recipe.youtubeId : null;
  const open = useVideo((s) => s.recipeId === recipe.id) && videoId != null;
  const toggle = useVideo((s) => s.toggle);
  // Opened by voice: start once Sous has finished saying so, so the two don't talk over each
  // other. Once started, the player stays (Sous talking later never restarts the video).
  const sousSpeaking = useVoice((s) => s.status === "speaking");
  const [started, setStarted] = useState(false);
  if (!open && started) setStarted(false);
  if (open && !sousSpeaking && !started) setStarted(true);
  const playerRef = useRef<HTMLDivElement>(null);
  const title = tutorial?.title ?? `How to make ${recipe.title}`;
  const start = videoId ? videoStartFor(recipe.id, stepIndex) : null;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    return () => clearTimeout(t);
  }, [open]);

  const body = (
    <>
      <span className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-linear-to-b from-[#3e4f45] to-[#1d2722]">
        <span className="flex size-7 items-center justify-center rounded-full bg-white/92">
          <img src={COOK_ICON.play} alt="" width={14} height={14} className="block size-3.5" />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[normal]">
        <span className="text-micro font-bold tracking-[0.8px] text-flame">TUTORIAL</span>
        <span className="line-clamp-2 text-sm font-semibold text-ink">{title}</span>
        <span className="truncate text-xs text-ink-soft">
          {videoId
            ? open
              ? "Playing below · tap to hide"
              : start != null
                ? `Plays from this step (${clock(start)})`
                : tutorial
                ? "Recipe video · plays right here"
                : "Video · plays right here"
            : "YouTube · opens in a new tab"}
        </span>
      </span>
    </>
  );

  const cardClass = cn(
    "flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface py-2 pl-2 pr-3 text-left transition active:scale-[0.99] hover:bg-cream",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
  );

  if (!videoId) {
    return (
      <a
        href={youtubeSearch(tutorial?.query ?? `${recipe.title} recipe`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title}: search YouTube (opens in a new tab)`}
        className={cn(cardClass, className)}
      >
        {body}
      </a>
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&autoplay=1${start ? `&start=${start}` : ""}`;
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button type="button" aria-expanded={open} aria-controls={`${id}-video`} onClick={() => toggle(recipe.id)} className={cardClass}>
        {body}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-video`}
            key="video"
            ref={playerRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="aspect-video min-h-[200px] w-full min-w-[200px] overflow-hidden rounded-[16px] bg-ink">
              {!started ? (
                <p className="flex size-full items-center justify-center text-sm text-white/80">Starting the video…</p>
              ) : (
                <iframe
                  src={src}
                  title={`${recipe.title}: video tutorial`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="block size-full border-0"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
