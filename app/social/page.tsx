"use client";

import { HeaderActions } from "@/components/social/HeaderActions";
import { SwipeDeck } from "@/components/social/SwipeDeck";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

/**
 * Social feed. The deck fills the screen instead of scrolling, so it reserves room
 * for the bottom nav only; the Skip / Yum buttons sit centered, clear of the orb.
 */
export default function SocialPage() {
  return (
    <div className="flex min-h-full flex-col pb-[calc(var(--nav-height)+var(--safe-bottom)+20px)]">
      <ScreenHeader
        title="Social"
        subtitle="Swipe right for Yum, left to skip"
        right={<HeaderActions />}
      />
      <SwipeDeck />
    </div>
  );
}
