"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { SocialUser } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

/**
 * Avatar + name + "time ago", linking to the author's profile. Never starts a card drag.
 * Figma list-row type: name 13–14px SemiBold ink, meta 11–12px ink-soft.
 */
export function AuthorLink({
  handle,
  user,
  createdAt,
  size = "md",
  className,
  onClick,
}: {
  handle: string;
  user?: SocialUser;
  createdAt: number;
  /** sm = 30px avatar (swipe card), md = 36px avatar (post sheet) */
  size?: "sm" | "md";
  className?: string;
  /** e.g. close a sheet before navigating */
  onClick?: () => void;
}) {
  const name = user?.name ?? handle;
  const small = size === "sm";
  return (
    <Link
      href={`/social/u/${encodeURIComponent(handle)}`}
      data-no-drag
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 min-w-0 max-w-full items-center gap-2.5 rounded-pill pr-2 transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <Avatar src={user?.avatar} name={name} size={small ? 30 : 36} className="shadow-card" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn("truncate font-semibold text-ink", small ? "text-meta" : "text-sm")}>
          {name}
          {user?.isMe && <span className="ml-1 font-medium text-ink-soft">(you)</span>}
        </span>
        <span className={cn("truncate text-ink-soft", small ? "text-caption" : "text-xs")}>
          @{handle} · {timeAgo(createdAt)}
        </span>
      </span>
    </Link>
  );
}
