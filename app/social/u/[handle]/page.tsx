"use client";

import { Camera, UserRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { FigmaIcon } from "@/components/social/FigmaIcon";
import { PostGrid } from "@/components/social/PostGrid";
import { PostSheet } from "@/components/social/PostSheet";
import { ProfileHero, ProfileStatsRow } from "@/components/social/ProfileHero";
import { ButtonLink, IconButton } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { postsBy, profileStats } from "@/lib/social/feed";
import { upvotesOf, userByHandle, useSocial } from "@/lib/stores/social";
import { toast } from "@/lib/stores/toast";

/** Public cooking profile. Social only: no nutrition or diary data ever appears here. */
export default function ProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = safeDecode(params?.handle ?? "");

  const users = useSocial((s) => s.users);
  const posts = useSocial((s) => s.posts);
  const myUpvotes = useSocial((s) => s.myUpvotes);
  const following = useSocial((s) => s.following);
  const toggleFollow = useSocial((s) => s.toggleFollow);
  const upvote = useSocial((s) => s.upvote);
  const unvote = useSocial((s) => s.unvote);

  const user = userByHandle(users, handle);
  const userPosts = postsBy(posts, handle);
  const [openId, setOpenId] = useState<string | null>(null);
  const openPost = openId ? (userPosts.find((p) => p.id === openId) ?? null) : null;
  const closeSheet = useCallback(() => setOpenId(null), []);

  if (!user) {
    return (
      <div className="pb-nav">
        <ScreenHeader back="/social" title="Profile" />
        <EmptyState
          icon={<UserRound className="size-6" />}
          title="Cook not found"
          body="This profile doesn't exist or has moved."
          action={
            <ButtonLink href="/social" variant="soft">
              Back to Social
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const iFollow = Boolean(following[user.handle]);
  const stats = profileStats(user, userPosts, myUpvotes, following);
  const openUpvoted = openPost ? Boolean(myUpvotes[openPost.id]) : false;

  return (
    <div className="pb-nav">
      {/* Figma 2.4 header bar: back circle left, share circle right */}
      <ScreenHeader
        back="/social"
        right={
          <IconButton label="Copy profile link" onClick={() => void copyProfileLink(user.handle)}>
            <FigmaIcon name="share18" />
          </IconButton>
        }
      />

      <ProfileHero user={user} following={iFollow} onToggleFollow={() => toggleFollow(user.handle)} />
      <ProfileStatsRow stats={stats} />

      <section className="mt-6 px-5">
        <SectionHeader
          title={user.isMe ? "Your plates" : "Plates"}
          action={
            <span className="text-meta text-ink-soft">
              {userPosts.length} {userPosts.length === 1 ? "post" : "posts"}
            </span>
          }
        />
        <div className="mt-3">
          {userPosts.length ? (
            <PostGrid posts={userPosts} myUpvotes={myUpvotes} onOpen={setOpenId} />
          ) : (
            <EmptyState
              className="rounded-card bg-surface shadow-card"
              icon={<Camera className="size-6" />}
              title="No plates yet"
              body={user.isMe ? "Cook something with Sous and share it here." : `${user.name.split(" ")[0]} hasn't shared anything yet.`}
              action={
                user.isMe ? (
                  <ButtonLink href="/social/new" variant="soft">
                    Share a dish
                  </ButtonLink>
                ) : undefined
              }
            />
          )}
        </div>
      </section>

      <PostSheet
        post={openPost}
        author={user}
        upvotes={openPost ? upvotesOf(openPost, myUpvotes) : 0}
        upvoted={openUpvoted}
        onToggleUpvote={() => {
          if (!openPost) return;
          if (openUpvoted) unvote(openPost.id);
          else upvote(openPost.id);
        }}
        onClose={closeSheet}
      />
    </div>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function copyProfileLink(handle: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/social/u/${encodeURIComponent(handle)}`);
    toast("Profile link copied", "success");
  } catch {
    toast("Couldn't copy the link", "warning");
  }
}
