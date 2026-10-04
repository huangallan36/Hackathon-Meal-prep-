"use client";

import { Flame, PartyPopper, Plus, RotateCcw, Undo2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { feedDeck } from "@/lib/social/feed";
import { upvotesOf, userByHandle, useSocial } from "@/lib/stores/social";
import { SwipeCard, type SwipeCardHandle, type SwipeDir } from "./SwipeCard";

/** How many cards are rendered: the top one plus two peeking behind */
const VISIBLE = 3;

/** The swipeable feed: card stack, Skip / Yum buttons and arrow-key support. */
export function SwipeDeck() {
  const posts = useSocial((s) => s.posts);
  const users = useSocial((s) => s.users);
  const skipped = useSocial((s) => s.skipped);
  const myUpvotes = useSocial((s) => s.myUpvotes);
  const upvote = useSocial((s) => s.upvote);
  const skip = useSocial((s) => s.skip);
  const unswipe = useSocial((s) => s.unswipe);
  const resetFeed = useSocial((s) => s.resetFeed);

  const deck = useMemo(() => feedDeck(posts, skipped, myUpvotes), [posts, skipped, myUpvotes]);
  const visible = deck.slice(0, VISIBLE);
  const topRef = useRef<SwipeCardHandle>(null);
  /** Bumps on every Yum to replay the "+1" burst */
  const [yums, setYums] = useState(0);
  /** The last swipe, for Undo */
  const [last, setLast] = useState<{ id: string; dir: SwipeDir } | null>(null);
  /** The card an Undo brought back, so it flies in from the side it left by */
  const [returning, setReturning] = useState<{ id: string; dir: SwipeDir } | null>(null);
  const canUndo = Boolean(last && (skipped[last.id] || myUpvotes[last.id]) && posts.some((p) => p.id === last.id));

  function decide(postId: string, dir: SwipeDir) {
    setLast({ id: postId, dir });
    if (dir === "right") {
      upvote(postId);
      setYums((n) => n + 1);
    } else {
      skip(postId);
    }
  }

  function undo() {
    if (!last) return;
    unswipe(last.id);
    setReturning(last);
    setLast(null);
  }

  function startOver() {
    setLast(null);
    setReturning(null);
    resetFeed();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        topRef.current?.fling("right");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        topRef.current?.fling("left");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!visible.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-5">
        <EmptyState
          className="animate-fade-up rounded-card bg-surface shadow-card"
          icon={<PartyPopper className="size-6" />}
          title="You're all caught up"
          body="You've seen every plate from your cooks. Share your own, or start the feed over."
          action={
            <div className="mt-2 flex flex-col items-center gap-2">
              <Button variant="soft" icon={<RotateCcw className="size-4" />} onClick={startOver}>
                Start over
              </Button>
              <ButtonLink href="/social/new" variant="ghost" icon={<Plus className="size-4" />}>
                Share a dish
              </ButtonLink>
              {canUndo && (
                <Button variant="ghost" size="sm" icon={<Undo2 className="size-4" />} onClick={undo} className="h-11">
                  Undo last swipe
                </Button>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-5">
      <div className="relative mb-9 min-h-[380px] flex-1">
        {visible.map((post, depth) => (
          <SwipeCard
            key={post.id}
            ref={depth === 0 ? topRef : undefined}
            post={post}
            author={userByHandle(users, post.author)}
            upvotes={upvotesOf(post, myUpvotes)}
            depth={depth}
            returnFrom={returning?.id === post.id ? returning.dir : undefined}
            onDecide={decide}
          />
        ))}
      </div>

      <div className="flex items-center justify-center gap-7">
        <div className="relative">
          {/* Undo sits to the left of Skip so the main pair stays centered (and clear of the orb) */}
          <AnimatePresence>
            {canUndo && (
              <motion.button
                key="undo"
                type="button"
                aria-label="Undo last swipe"
                title="Undo last swipe"
                onClick={undo}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className="absolute right-full top-1/2 mr-5 -mt-[22px] flex size-11 items-center justify-center rounded-full bg-surface text-ink-soft shadow-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Undo2 className="size-[18px]" strokeWidth={2.4} />
              </motion.button>
            )}
          </AnimatePresence>
          <button
            type="button"
            aria-label="Skip"
            title="Skip (left arrow)"
            onClick={() => topRef.current?.fling("left")}
            className="flex size-14 items-center justify-center rounded-full bg-surface text-ink-soft shadow-card transition hover:text-ink active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-6" strokeWidth={2.6} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Yum: upvote this dish"
          title="Yum (right arrow)"
          onClick={() => topRef.current?.fling("right")}
          className="relative flex size-[68px] items-center justify-center rounded-full bg-accent text-white shadow-accent transition hover:bg-accent-strong active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        >
          <Flame className="size-8" fill="currentColor" strokeWidth={1.8} />
          {yums > 0 && (
            <motion.span
              key={yums}
              aria-hidden
              initial={{ opacity: 1, y: 0, scale: 0.6 }}
              animate={{ opacity: 0, y: -52, scale: 1.3 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="pointer-events-none absolute -top-1 rounded-pill bg-accent px-2 py-0.5 text-xs font-bold text-white shadow-accent"
            >
              +1
            </motion.span>
          )}
        </button>
      </div>
      <p className="mt-3 hidden text-center text-xs text-ink-faint pointer-fine:block">Swipe, or use the arrow keys</p>
    </div>
  );
}
