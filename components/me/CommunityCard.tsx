"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card, SectionHeader } from "@/components/ui/Card";
import { DEMO_USER } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useDisplayName } from "./ProfileHeader";

/** Not in Figma: Social lives under Me, so Me links to the feed and your profile (same card style) */
export function CommunityCard({ className }: { className?: string }) {
  const name = useDisplayName();
  return (
    <Card className={cn("px-4 pb-1.5 pt-4", className)}>
      <SectionHeader title="Community" />
      <ul className="mt-1">
        <Row
          href="/social"
          title="Social feed"
          subtitle="See what friends are cooking"
          icon={
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Users className="size-[18px]" strokeWidth={1.8} />
            </span>
          }
        />
        <Row
          href={`/social/u/${encodeURIComponent(DEMO_USER.handle)}`}
          title="Your profile"
          subtitle={`@${DEMO_USER.handle}`}
          icon={<Avatar src={DEMO_USER.avatar} name={name} size={36} />}
          divided
        />
      </ul>
    </Card>
  );
}

function Row({ href, title, subtitle, icon, divided }: { href: string; title: string; subtitle: string; icon: ReactNode; divided?: boolean }) {
  return (
    <li className={cn(divided && "border-t border-line")}>
      <Link
        href={href}
        className="-mx-2 flex items-center gap-3 rounded-tile px-2 py-2.5 transition hover:bg-cream active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {icon}
        <span className="min-w-0 flex-1 leading-[normal]">
          <span className="block truncate text-body font-semibold text-ink">{title}</span>
          <span className="block truncate text-xs text-ink-soft">{subtitle}</span>
        </span>
        <img src="/figma/icons/chevron-right.svg" alt="" width={18} height={18} className="block size-[18px] shrink-0" />
      </Link>
    </li>
  );
}
