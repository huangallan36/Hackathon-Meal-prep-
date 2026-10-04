/** Pure selectors for the Social tab (feed deck, profiles, share sample). */
import { getCatalog } from "@/lib/recipes/catalog";
import { upvotesOf } from "@/lib/stores/social";
import type { SocialPost, SocialUser } from "@/lib/types";

/** Posts not yet swiped (skipped or upvoted), newest first */
export function feedDeck(posts: SocialPost[], skipped: Record<string, true>, myUpvotes: Record<string, true>): SocialPost[] {
  return posts.filter((p) => !skipped[p.id] && !myUpvotes[p.id]).sort((a, b) => b.createdAt - a.createdAt);
}

export function postsBy(posts: SocialPost[], handle: string): SocialPost[] {
  return posts.filter((p) => p.author === handle).sort((a, b) => b.createdAt - a.createdAt);
}

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  upvotes: number;
}

export function profileStats(
  user: SocialUser,
  posts: SocialPost[],
  myUpvotes: Record<string, true>,
  iFollow: boolean,
): ProfileStats {
  return {
    posts: posts.length,
    followers: user.followers + (iFollow && !user.isMe ? 1 : 0),
    following: user.following,
    upvotes: posts.reduce((sum, p) => sum + upvotesOf(p, myUpvotes), 0),
  };
}

export interface SharePhotoSample {
  src: string;
  recipeId: number;
  title: string;
}

/** A real dish photo from the catalog for "Use sample photo" (prefers CDN photos over placeholders) */
export function sharePhotoSample(): SharePhotoSample | null {
  const catalog = getCatalog();
  const pick = catalog.find((r) => /^https:\/\//.test(r.image)) ?? catalog[0];
  return pick ? { src: pick.image, recipeId: pick.id, title: pick.title } : null;
}
