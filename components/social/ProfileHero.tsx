"use client";

import { Check, PenLine, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import type { ProfileStats } from "@/lib/social/feed";
import { toast } from "@/lib/stores/toast";
import type { SocialUser } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { FigmaIcon } from "./FigmaIcon";

/**
 * Profile header like Figma 3.1: avatar circle + name (Fraunces 22) + a 12px ink-soft
 * line (handle · location), then the bio, the cooking streak badge and Follow / Edit.
 */
export function ProfileHero({
  user,
  following,
  onToggleFollow,
}: {
  user: SocialUser;
  following: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <section className="px-5 pt-2 animate-fade-up">
      <div className="flex items-center gap-3">
        <Avatar src={user.avatar} name={user.name} size={56} className="shadow-card" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-heading font-semibold leading-tight text-ink">{user.name}</h1>
          <p className="mt-px truncate text-xs text-ink-soft">
            @{user.handle}
            {user.location && ` · ${user.location}`}
          </p>
        </div>
      </div>

      <p className="mt-3.5 text-body leading-relaxed text-ink">{user.bio}</p>

      <div className="mt-3 flex">
        <Chip tone="flame" icon={<FigmaIcon name="flame16" />}>
          {user.streak}-day cooking streak
        </Chip>
      </div>

      <div className="mt-4">
        {user.isMe ? (
          <Button
            variant="secondary"
            full
            icon={<PenLine className="size-4" strokeWidth={1.9} />}
            onClick={() => toast("Profile editing is coming soon")}
          >
            Edit profile
          </Button>
        ) : (
          <Button
            variant={following ? "secondary" : "primary"}
            full
            aria-pressed={following}
            icon={following ? <Check className="size-4" strokeWidth={2.2} /> : <UserPlus className="size-4" strokeWidth={1.9} />}
            onClick={onToggleFollow}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    </section>
  );
}

/** Posts / followers / following / total yums in one Figma card (white, 1px line, dividers) */
export function ProfileStatsRow({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Posts", value: stats.posts },
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
    { label: "Yums", value: stats.upvotes },
  ];
  return (
    <dl className="mx-5 mt-4 grid grid-cols-4 rounded-card bg-surface py-3.5 shadow-card animate-fade-up">
      {items.map((item, i) => (
        <div key={item.label} className={i ? "flex flex-col items-center gap-0.5 border-l border-line" : "flex flex-col items-center gap-0.5"}>
          <dt className="order-2 text-xs text-ink-soft">{item.label}</dt>
          <dd className="order-1">
            <motion.span
              key={item.value}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="block text-lead font-semibold tabular-nums text-ink"
            >
              {formatCount(item.value)}
            </motion.span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
