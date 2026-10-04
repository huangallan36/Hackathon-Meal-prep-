"use client";

/**
 * Social feed state. Seed posts are rebuilt each day (relative timestamps stay fresh);
 * user posts, upvotes, skips and follows persist.
 * Displayed upvotes = post.upvotes + (myUpvotes[post.id] ? 1 : 0).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storageKey } from "@/lib/config";
import { getCatalog } from "@/lib/recipes/catalog";
import { seedPosts, seedUsers } from "@/lib/seed/social";
import { persistStorage } from "@/lib/storage";
import type { PostDraft, SocialPost, SocialUser } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";

interface SocialState {
  users: SocialUser[];
  posts: SocialPost[];
  myUpvotes: Record<string, true>;
  skipped: Record<string, true>;
  following: Record<string, true>;
  /** Hand-off from "Share to Social" in the AI tab to /social/new */
  draft: PostDraft | null;
  /** today + catalog ids: seed posts are rebuilt when either changes */
  seedKey: string;

  upvote: (postId: string) => void;
  /** Take back a Yum (post detail sheet toggle) */
  unvote: (postId: string) => void;
  skip: (postId: string) => void;
  /** Undo a swipe either way, so the post returns to the feed */
  unswipe: (postId: string) => void;
  addPost: (post: Omit<SocialPost, "id" | "createdAt" | "upvotes">) => SocialPost;
  toggleFollow: (handle: string) => void;
  setDraft: (draft: PostDraft | null) => void;
  /** Clear swipes so the feed starts over */
  resetFeed: () => void;
}

const currentSeedKey = () => `${todayISO()}|${getCatalog().map((r) => r.id).join(",")}`;

function freshSeed() {
  return { users: seedUsers(), posts: seedPosts(Date.now()), seedKey: currentSeedKey() };
}

export const useSocial = create<SocialState>()(
  persist(
    (set) => ({
      ...freshSeed(),
      myUpvotes: {},
      skipped: {},
      following: { "maya.makes": true, "priya.plates": true },
      draft: null,

      upvote: (postId) => set((s) => ({ myUpvotes: { ...s.myUpvotes, [postId]: true } })),
      unvote: (postId) => set((s) => ({ myUpvotes: without(s.myUpvotes, postId) })),
      skip: (postId) => set((s) => ({ skipped: { ...s.skipped, [postId]: true } })),
      unswipe: (postId) => set((s) => ({ myUpvotes: without(s.myUpvotes, postId), skipped: without(s.skipped, postId) })),
      addPost: (post) => {
        const full: SocialPost = { ...post, id: uid("p"), createdAt: Date.now(), upvotes: 0 };
        set((s) => ({ posts: [full, ...s.posts] }));
        return full;
      },
      toggleFollow: (handle) =>
        set((s) => {
          const next = { ...s.following };
          if (next[handle]) delete next[handle];
          else next[handle] = true;
          return { following: next };
        }),
      setDraft: (draft) => set({ draft }),
      resetFeed: () => set({ skipped: {}, myUpvotes: {} }),
    }),
    {
      name: storageKey("social"),
      storage: persistStorage,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SocialState>;
        // Profiles are read-only seed data: always take them from code so edits show up.
        if (p.seedKey === currentSeedKey()) return { ...current, ...p, users: current.users };
        const seed = freshSeed();
        const userPosts = (p.posts ?? []).filter((post) => !post.id.startsWith("seed-"));
        return { ...current, ...p, ...seed, posts: [...userPosts, ...seed.posts] };
      },
    },
  ),
);

function without(map: Record<string, true>, key: string): Record<string, true> {
  if (!map[key]) return map;
  const next = { ...map };
  delete next[key];
  return next;
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function upvotesOf(post: SocialPost, myUpvotes: Record<string, true>): number {
  return post.upvotes + (myUpvotes[post.id] ? 1 : 0);
}

/** recipeId -> total upvotes across all posts of that recipe. Feeds "Most Popular". */
export function recipePopularity(posts: SocialPost[], myUpvotes: Record<string, true>): Map<number, number> {
  const out = new Map<number, number>();
  for (const p of posts) {
    if (p.recipeId == null) continue;
    out.set(p.recipeId, (out.get(p.recipeId) ?? 0) + upvotesOf(p, myUpvotes));
  }
  return out;
}

export function userByHandle(users: SocialUser[], handle: string): SocialUser | undefined {
  return users.find((u) => u.handle === handle);
}
