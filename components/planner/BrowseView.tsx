"use client";

import { useState } from "react";
import { dayPhrase } from "@/lib/planner/format";
import { usePopularRecipes, useRecentRecipes, useWeekPlan, type PlanDay, type RecentItem } from "@/lib/planner/hooks";
import type { ISODate, Recipe } from "@/lib/types";
import { PlannerSection, Scroller } from "./PlannerSection";
import { PlanTargetBanner } from "./PlanTargetBanner";
import { PopularCard } from "./PopularCard";
import { RecentCard, RecentEmpty } from "./RecentCard";
import { WeekStrip } from "./WeekStrip";

const RECENT_COLLAPSED = 3;

/** Figma 2.1 browse state ("For you"): Most popular, Recently made, then the week plan */
export function BrowseView({
  planTarget,
  busyId,
  onDay,
  onCancelTarget,
  onOpen,
  onOpenRecent,
}: {
  planTarget: ISODate | null;
  /** Recipe id currently loading (recent items not held locally) */
  busyId: number | null;
  onDay: (day: PlanDay) => void;
  onCancelTarget: () => void;
  onOpen: (recipe: Recipe) => void;
  onOpenRecent: (item: RecentItem) => void;
}) {
  const days = useWeekPlan();
  const popular = usePopularRecipes();
  const recent = useRecentRecipes();
  const [open, setOpen] = useState({ popular: false, recent: false });

  const plannedCount = days.reduce((n, d) => n + d.meals.length, 0);
  const next = days.find((d) => d.meals.length > 0);
  const target = planTarget ? days.find((d) => d.date === planTarget) : undefined;
  const shownRecent = open.recent ? recent : recent.slice(0, RECENT_COLLAPSED);

  return (
    <>
      {popular.length > 0 && (
        <PlannerSection
          id="popular"
          title="Most popular"
          expanded={open.popular}
          onToggle={popular.length > 2 ? () => setOpen((o) => ({ ...o, popular: !o.popular })) : undefined}
        >
          <Scroller label="Most popular recipes" wrap={open.popular}>
            {popular.map((p, i) => (
              <PopularCard key={p.recipe.id} recipe={p.recipe} upvotes={p.upvotes} index={i} onOpen={onOpen} />
            ))}
          </Scroller>
        </PlannerSection>
      )}

      <PlannerSection
        id="recent"
        title="Recently made"
        expanded={open.recent}
        onToggle={recent.length > RECENT_COLLAPSED ? () => setOpen((o) => ({ ...o, recent: !o.recent })) : undefined}
      >
        {recent.length ? (
          <div className="grid grid-cols-3 gap-x-3.5 gap-y-4">
            {shownRecent.map((item, i) => (
              <RecentCard key={item.id} item={item} index={i} busy={busyId === item.id} onOpen={onOpenRecent} />
            ))}
          </div>
        ) : (
          <RecentEmpty />
        )}
      </PlannerSection>

      <PlannerSection
        id="week"
        title="This week"
        className="pt-7"
        action={
          plannedCount > 0 ? (
            <span className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-caption font-semibold text-accent">
              {plannedCount} planned
            </span>
          ) : undefined
        }
      >
        <p className="-mt-1 mb-3 line-clamp-2 text-xs text-ink-soft">
          {next ? `Next up: ${next.meals[0].title}, ${dayPhrase(next.date)}` : "Tap a day, then pick something to cook"}
        </p>
        <WeekStrip days={days} target={planTarget} busyId={busyId} onDay={onDay} />
        {target && <PlanTargetBanner date={target.date} onCancel={onCancelTarget} className="mt-3" />}
      </PlannerSection>
    </>
  );
}
