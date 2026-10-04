"use client";

import { Check, Flame, MapPin, PenLine, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { ProfileStats } from "@/lib/social/feed";
import { toast } from "@/lib/stores/toast";
import type { SocialUser } from "@/lib/types";
import { formatCount } from "@/lib/utils";

/** Avatar, name, handle, location, bio, streak and the Follow / Edit button */
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
    <section className="flex flex-col items-center px-5 text-center animate-fade-up">
      <div className="relative">
        <span
          aria-hidden
          className="absolute -inset-4 rounded-full bg-[radial-gradient(circle,var(--color-accent-soft)_0%,transparent_70%)]"
        />
        <Avatar src={user.avatar} name={user.name} size={104} className="relative ring-4 ring-surface shadow-card" />
      </div>

      <h1 className="mt-4 font-display text-[28px] font-semibold leading-tight text-ink">{user.name}</h1>
      <p className="mt-0.5 text-sm font-medium text-ink-soft">@{user.handle}</p>
      {user.location && (
        <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-faint">
          <MapPin className="size-3.5" />
          {user.location}
        </p>
      )}
      <p className="mt-3 max-w-[310px] text-[15px] leading-relaxed text-ink">{user.bio}</p>

      <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent-strong animate-pop">
        <Flame className="size-4 text-accent" fill="currentColor" />
        {user.streak}-day streak
      </span>

      <div className="mt-5 w-full max-w-[280px]">
        {user.isMe ? (
          <Button
            variant="secondary"
            full
            icon={<PenLine className="size-4" />}
            onClick={() => toast("Profile editing is coming soon")}
          >
            Edit profile
          </Button>
        ) : (
          <Button
            variant={following ? "secondary" : "primary"}
            full
            aria-pressed={following}
            icon={following ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            onClick={onToggleFollow}
          >
            {following ? "Following" : "Follow"}
          </Button>
        )}
      </div>
    </section>
  );
}

/** Posts / followers / following / total yums */
export function ProfileStatsRow({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Posts", value: stats.posts },
    { label: "Followers", value: stats.followers },
    { label: "Following", value: stats.following },
    { label: "Yums", value: stats.upvotes },
  ];
  return (
    <dl className="mx-5 mt-6 grid grid-cols-4 rounded-card bg-surface py-3.5 shadow-card animate-fade-up">
      {items.map((item, i) => (
        <div key={item.label} className={i ? "flex flex-col items-center border-l border-line" : "flex flex-col items-center"}>
          <dt className="order-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">{item.label}</dt>
          <dd className="order-1">
            <motion.span
              key={item.value}
              initial={{ y: -6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="block font-display text-xl font-semibold tabular-nums text-ink"
            >
              {formatCount(item.value)}
            </motion.span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
