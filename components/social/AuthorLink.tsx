"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { SocialUser } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

/** Avatar + name + time ago, linking to the author's profile. Never starts a card drag. */
export function AuthorLink({
  handle,
  user,
  createdAt,
  tone = "dark",
  className,
}: {
  handle: string;
  user?: SocialUser;
  createdAt: number;
  /** "light" = white text for photo scrims */
  tone?: "light" | "dark";
  className?: string;
}) {
  const name = user?.name ?? handle;
  return (
    <Link
      href={`/social/u/${encodeURIComponent(handle)}`}
      data-no-drag
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        "inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-pill pr-2 transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <Avatar
        src={user?.avatar}
        name={name}
        size={34}
        className={cn("ring-2", tone === "light" ? "ring-white/70" : "ring-surface")}
      />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className={cn("truncate text-sm font-semibold", tone === "light" ? "text-white" : "text-ink")}>
          {name}
          {user?.isMe && <span className={cn("ml-1.5 font-medium", tone === "light" ? "text-white/70" : "text-ink-faint")}>(you)</span>}
        </span>
        <span className={cn("shrink-0 text-xs", tone === "light" ? "text-white/70" : "text-ink-faint")}>
          · {timeAgo(createdAt)}
        </span>
      </span>
    </Link>
  );
}
