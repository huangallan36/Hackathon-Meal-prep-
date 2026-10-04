"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { DEMO_USER } from "@/lib/config";
import { userByHandle, useSocial } from "@/lib/stores/social";

/** Feed header actions: new post (+) and the demo user's profile */
export function HeaderActions() {
  const me = useSocial((s) => userByHandle(s.users, DEMO_USER.handle));
  return (
    <>
      <Link
        href="/social/new"
        aria-label="New post"
        title="New post"
        className="inline-flex size-11 items-center justify-center rounded-full bg-accent text-white shadow-accent transition hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
      >
        <Plus className="size-5" strokeWidth={2.6} />
      </Link>
      <Link
        href={`/social/u/${DEMO_USER.handle}`}
        aria-label="Your profile"
        title="Your profile"
        className="rounded-full transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Avatar src={me?.avatar ?? DEMO_USER.avatar} name={me?.name ?? DEMO_USER.name} size={44} className="ring-2 ring-surface shadow-soft" />
      </Link>
    </>
  );
}
