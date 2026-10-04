"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { DEMO_USER } from "@/lib/config";
import { userByHandle, useSocial } from "@/lib/stores/social";
import { cn } from "@/lib/utils";
import { FigmaIcon } from "./FigmaIcon";

/**
 * Feed header buttons: new post (+) and your profile, as Figma 40px white header circles.
 * Wrapped in a non-shrinking row so both fit ScreenHeader's right slot.
 */
export function HeaderActions() {
  const me = useSocial((s) => userByHandle(s.users, DEMO_USER.handle));
  return (
    <div className="flex shrink-0 items-center gap-2">
      <HeaderLink href="/social/new" label="New post">
        <FigmaIcon name="plus16" />
      </HeaderLink>
      <HeaderLink href={`/social/u/${DEMO_USER.handle}`} label="Your profile">
        <Avatar src={me?.avatar ?? DEMO_USER.avatar} name={me?.name ?? DEMO_USER.name} size={40} />
      </HeaderLink>
    </div>
  );
}

/** A link styled like IconButton (40px white circle, 48px tap target) */
function HeaderLink({ label, className, children, ...rest }: { label: string } & ComponentProps<typeof Link>) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink transition after:absolute after:-inset-1 after:content-[''] hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
