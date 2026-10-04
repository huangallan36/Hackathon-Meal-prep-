"use client";

import { useMemo, useState } from "react";
import { dayPhrase } from "@/lib/planner/format";
import { usePopularRecipes, useRecentRecipes, useWeekPlan, type PlanDay, type RecentItem } from "@/lib/planner/hooks";
import { cuisineCounts } from "@/lib/planner/search";
import { getCatalog } from "@/lib/recipes/catalog";
import type { ISODate, Recipe } from "@/lib/types";
import { QUICK_MINUTES } from "./FilterChips";
import { PlannerSection, Scroller } from "./PlannerSection";
import { PlanTargetBanner } from "./PlanTargetBanner";
import { PopularCard } from "./PopularCard";
import { RecentCard, RecentEmpty } from "./RecentCard";
import { RecipeRow } from "./RecipeRow";
import { WeekStrip } from "./WeekStrip";

const QUICK_COLLAPSED = 3;

/** Empty-query "Read mode": most popular, this week, recently made, quick weeknight, cuisines */
export function BrowseView({
  planTarget,
  busyId,
  onDay,
  onCancelTarget,
  onOpen,
  onOpenRecent,
  onQuery,
}: {
  planTarget: ISODate | null;
  /** Recipe id currently loading (recent items not held locally) */
  busyId: number | null;
  onDay: (day: PlanDay) => void;
  onCancelTarget: () => void;
  onOpen: (recipe: Recipe) => void;
  onOpenRecent: (item: RecentItem) => void;
  onQuery: (query: string) => void;
}) {
  const days = useWeekPlan();
  const popular = usePopularRecipes();
  const recent = useRecentRecipes();
  const [quickOpen, setQuickOpen] = useState(false);

  const quick = useMemo(
    () => getCatalog().filter((r) => r.readyInMinutes <= QUICK_MINUTES).sort((a, b) => a.readyInMinutes - b.readyInMinutes),
    [],
  );
  const cuisines = useMemo(() => cuisineCounts().slice(0, 10), []);

  const plannedCount = days.reduce((n, d) => n + d.meals.length, 0);
  const next = days.find((d) => d.meals.length > 0);
  const target = planTarget ? days.find((d) => d.date === planTarget) : undefined;

  return (
    <>
      {popular.length > 0 && (
        <PlannerSection id="popular" title="Most Popular" subtitle="What the Sous community keeps cooking" className="mt-8">
          <Scroller label="Most popular recipes">
            {popular.map((p, i) => (
              <PopularCard key={p.recipe.id} recipe={p.recipe} upvotes={p.upvotes} rank={i + 1} index={i} onOpen={onOpen} />
            ))}
          </Scroller>
        </PlannerSection>
      )}

      <PlannerSection
        id="week"
        title="This week"
        subtitle={
          next
            ? `Next up: ${next.meals[0].title}, ${dayPhrase(next.date)}`
            : "Tap a day, then pick something to cook"
        }
        action={
          plannedCount > 0 ? (
            <span className="shrink-0 rounded-pill bg-herb-soft px-3 py-1 text-xs font-semibold text-herb">
              {plannedCount} planned
            </span>
          ) : undefined
        }
      >
        <WeekStrip days={days} target={planTarget} onDay={onDay} />
        {target && <PlanTargetBanner date={target.date} onCancel={onCancelTarget} className="mt-3" />}
      </PlannerSection>

      <PlannerSection id="recent" title="Recently Made" subtitle={recent.length ? "Your greatest hits, one tap from round two" : undefined}>
        {recent.length ? (
          <Scroller label="Recently made">
            {recent.map((item, i) => (
              <RecentCard key={item.id} item={item} index={i} busy={busyId === item.id} onOpen={onOpenRecent} />
            ))}
          </Scroller>
        ) : (
          <RecentEmpty />
        )}
      </PlannerSection>

      {quick.length > 0 && (
        <PlannerSection
          id="quick"
          title="Quick weeknight"
          subtitle={`On the table in ${QUICK_MINUTES} minutes or less`}
          total={quick.length}
          expanded={quickOpen}
          onToggle={quick.length > QUICK_COLLAPSED ? () => setQuickOpen((o) => !o) : undefined}
        >
          <div className="flex flex-col gap-3">
            {(quickOpen ? quick : quick.slice(0, QUICK_COLLAPSED)).map((r, i) => (
              <RecipeRow key={r.id} recipe={r} index={i} onOpen={onOpen} />
            ))}
          </div>
        </PlannerSection>
      )}

      {cuisines.length > 0 && (
        <PlannerSection id="cuisines" title="Browse by cuisine">
          <div className="flex flex-wrap gap-2">
            {cuisines.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => onQuery(c.name)}
                className="inline-flex h-11 items-center gap-2 rounded-pill bg-surface px-4 text-sm font-semibold text-ink shadow-soft ring-1 ring-line transition hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {c.name}
                <span className="text-xs font-medium text-ink-faint">{c.count}</span>
              </button>
            ))}
          </div>
        </PlannerSection>
      )}
    </>
  );
}
