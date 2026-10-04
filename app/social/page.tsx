"use client";

import { FigmaIcon } from "@/components/social/FigmaIcon";
import { HeaderActions } from "@/components/social/HeaderActions";
import { SwipeDeck } from "@/components/social/SwipeDeck";
import { PageTitle, ScreenHeader } from "@/components/ui/ScreenHeader";

/**
 * Social feed (under the Me tab). Header bar + large title like Figma 2.4 groceries,
 * with the green "Tuned to you" pill from 2.1 as the hint. The deck fills the screen
 * instead of scrolling, so it reserves room for the bottom nav only; the Skip / Yum
 * buttons sit centered, clear of the orb.
 */
export default function SocialPage() {
  return (
    <div className="flex min-h-full flex-col pb-[calc(var(--nav-height)+var(--safe-bottom)+20px)]">
      <ScreenHeader back="/me" right={<HeaderActions />} />
      <PageTitle
        title="Social"
        className="pt-1"
        subtitle={
          <span className="mt-0.5 inline-flex items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 py-1 text-caption font-medium text-accent">
            <FigmaIcon name="sparkle12" />
            Swipe right to Yum · left to skip
          </span>
        }
      />
      <SwipeDeck />
    </div>
  );
}
