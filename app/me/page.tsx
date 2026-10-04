"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActivityRow } from "@/components/diary/ActivityRow";
import { CalorieRing } from "@/components/diary/CalorieRing";
import { MacroBars } from "@/components/diary/MacroBars";
import { stagger } from "@/components/diary/stagger";
import { CommunityCard } from "@/components/me/CommunityCard";
import { ProfileHeader } from "@/components/me/ProfileHeader";
import { WeekLogTile } from "@/components/me/WeekLogTile";
import { useWeekWindow, WeekRangePill } from "@/components/me/WeekRange";
import { Card, SectionLabel } from "@/components/ui/Card";
import { dayInfos, daysEnding, nutrientRows, weekSummary } from "@/lib/diary/stats";
import { useDiary } from "@/lib/stores/diary";

const MACRO_KEYS = new Set(["protein", "carbs", "fat"]);

/** Me tab (Figma 3.1 personal): weekly averages, macros, calendar + activity, community */
export default function MePage() {
  const entries = useDiary((s) => s.entries);
  const goals = useDiary((s) => s.goals);
  const activity = useDiary((s) => s.activity);
  const week = useWeekWindow();

  const summary = useMemo(() => weekSummary(entries, week.end), [entries, week.end]);
  const info = useMemo(() => dayInfos(entries, goals.calories), [entries, goals.calories]);
  const days = daysEnding(week.end);
  const macros = nutrientRows(summary.averages, goals, ["macro"]).filter((r) => MACRO_KEYS.has(r.def.key));
  const empty = summary.loggedDays.length === 0;

  return (
    <div className="flex flex-col pb-nav">
      <ProfileHeader calorieGoal={goals.calories} />

      <div className="flex items-center justify-between gap-3 px-5 pt-[18px]">
        <SectionLabel className="leading-[normal]">Weekly average</SectionLabel>
        <WeekRangePill
          start={week.start}
          end={week.end}
          canPrev={week.canPrev}
          canNext={week.canNext}
          onPrev={week.prev}
          onNext={week.next}
          chevLeft="/figma/v2/2014-1326/icon-chev-l.svg"
          chevRight="/figma/v2/2014-1326/icon-chev-r.svg"
        />
      </div>

      <section aria-label="Calories, daily average" className="animate-fade-up px-5 pt-3" style={stagger(0)}>
        <CalorieRing key={week.end} consumed={summary.averages.calories} goal={goals.calories} />
        {empty && <p className="px-1 pt-2 text-xs text-ink-faint">Nothing logged that week.</p>}
      </section>

      <section aria-label="Macros, daily average" className="animate-fade-up px-5 pt-3" style={stagger(1)}>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 leading-[normal]">
            <h2 className="text-base font-semibold text-ink">Macros</h2>
            <Link
              href="/me/nutrients"
              aria-label="See all nutrients"
              className="relative text-meta font-semibold text-accent after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              See all
            </Link>
          </div>
          <MacroBars key={week.end} rows={macros} />
        </Card>
      </section>

      <div className="flex animate-fade-up items-start gap-3 px-5 pt-3" style={stagger(2)}>
        <WeekLogTile days={days} info={info} />
        <ActivityRow activity={activity} days={days} />
      </div>

      <div className="animate-fade-up px-5 pt-3" style={stagger(3)}>
        <CommunityCard />
      </div>
    </div>
  );
}
