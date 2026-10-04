"use client";

import { NotebookPen, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { HighlightedNutrients } from "@/components/diary/HighlightedNutrients";
import { estimateNote } from "@/components/diary/NutrientsSection";
import { stagger } from "@/components/diary/stagger";
import { NutrientInsightCard } from "@/components/me/NutrientInsightCard";
import { useWeekWindow, WeekRangePill } from "@/components/me/WeekRange";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { nutrientInsight } from "@/lib/diary/insight";
import { weeklyNutrientRows, weekSummary } from "@/lib/diary/stats";
import { useDiaryView } from "@/lib/diary/view";
import { useDiary } from "@/lib/stores/diary";

/** Figma 3.2 "Highlighted nutrients": the week's averages vs. daily targets, with a Sous tip */
export default function NutrientsPage() {
  const entries = useDiary((s) => s.entries);
  const goals = useDiary((s) => s.goals);
  const dismissed = useDiaryView((s) => s.insightDismissed);
  const dismiss = useDiaryView((s) => s.dismissInsight);
  const week = useWeekWindow();

  const summary = useMemo(() => weekSummary(entries, week.end), [entries, week.end]);
  const rows = useMemo(() => weeklyNutrientRows(summary.averages, goals), [summary, goals]);
  const period = week.canNext ? "that week" : "this week";
  const insight = useMemo(() => nutrientInsight(rows, period), [rows, period]);
  const empty = summary.loggedDays.length === 0;
  const note = empty ? null : estimateNote(summary);

  return (
    <>
      <ScreenHeader
        back="/me"
        right={
          <WeekRangePill
            start={week.start}
            end={week.end}
            canPrev={week.canPrev}
            canNext={week.canNext}
            onPrev={week.prev}
            onNext={week.next}
            chevLeft="/figma/screens/2-157/icon-chev-l-1.svg"
            chevRight="/figma/screens/2-157/icon-chev-r.svg"
          />
        }
      />

      <div className="flex flex-col pb-nav">
        <div className="flex flex-col gap-1 px-5 pt-1 leading-[normal]">
          <h1 className="font-display text-[28px] font-semibold text-ink">Highlighted nutrients</h1>
          <p className="text-sm text-ink-soft">Weekly average vs. your daily targets</p>
        </div>

        {empty ? (
          <EmptyState
            className="animate-fade-up pt-12"
            icon={<NotebookPen className="size-6" />}
            title="Nothing logged that week"
            body="Log meals in your diary and Sous will show how your nutrients add up."
            action={<ButtonLink href="/diary">Open diary</ButtonLink>}
          />
        ) : (
          <>
            {!dismissed && (
              <div className="animate-fade-up px-5 pt-4" style={stagger(0)}>
                <NutrientInsightCard insight={insight} onDismiss={dismiss} />
              </div>
            )}
            <HighlightedNutrients key={week.end} rows={rows} className="px-5 pt-3.5" style={stagger(1)} />
            {note && (
              <p className="flex items-start gap-1.5 px-6 pt-3 text-xs leading-relaxed text-ink-faint">
                <Sparkles className="mt-0.5 size-3 shrink-0" aria-hidden />
                {note}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
