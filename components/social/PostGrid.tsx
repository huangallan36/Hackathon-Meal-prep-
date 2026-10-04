"use client";

import { motion } from "motion/react";
import { SmartImage } from "@/components/ui/Misc";
import { upvotesOf } from "@/lib/stores/social";
import type { SocialPost } from "@/lib/types";
import { UpvotePill } from "./UpvotePill";

/** 3-column square photo grid (Figma 14px thumb radius) with an upvote pill on each tile */
export function PostGrid({
  posts,
  myUpvotes,
  onOpen,
}: {
  posts: SocialPost[];
  myUpvotes: Record<string, true>;
  onOpen: (postId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {posts.map((post, i) => {
        const count = upvotesOf(post, myUpvotes);
        return (
          <motion.button
            key={post.id}
            type="button"
            onClick={() => onOpen(post.id)}
            aria-label={`${post.dishName}, ${count} yums`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(i, 12) * 0.035, type: "spring", stiffness: 320, damping: 28 }}
            className="group relative aspect-square overflow-hidden rounded-thumb bg-cream-deep transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
          >
            <SmartImage src={post.image} alt="" className="size-full transition-transform duration-300 group-hover:scale-105" />
            <UpvotePill count={count} size="sm" active={Boolean(myUpvotes[post.id])} className="absolute bottom-1.5 left-1.5" />
          </motion.button>
        );
      })}
    </div>
  );
}
