"use client";

import type { CSSProperties } from "react";
import { Card } from "@/components/ui/Card";
import { fmt, ratio } from "@/lib/diary/stats";
import { cn } from "@/lib/utils";
import { CountUp } from "./CountUp";
import { ProgressRing } from "./ProgressRing";

/** Exercise calories that fill the "Burned" ring (Figma 3.3: 310 kcal draws ~62%) */
export const BURN_GOAL = 500;

const TRACK = "/figma/v2/2014-1536/ellipse.svg";

/**
 * Figma 3.3 day rings: Eaten (avocado, vs. the calorie goal), Burned (tomato, exercise) and
 * Left (lemon: goal − eaten + burned). Past the goal "Left" becomes "Over" in tomato.
 */
export function DaySummary({
  eaten,
  burned,
  goal,
  className,
  style,
}: {
  eaten: number;
  burned: number;
  goal: number;
  className?: string;
  style?: CSSProperties;
}) {
  const e = Number.isFinite(eaten) ? Math.max(0, Math.round(eaten)) : 0;
  const b = Number.isFinite(burned) ? Math.max(0, Math.round(burned)) : 0;
  const g = Number.isFinite(goal) && goal > 0 ? goal : 0;
  const left = Math.round(g - e + b);
  const over = left < 0;

  return (
    <Card className={cn("flex items-start justify-between px-3.5 py-4", className)} style={style}>
      <Ring label="Eaten" value={e} ratio={ratio(e, g)} color="stroke-accent" title={`Eaten: ${fmt(e)} of ${fmt(g)} kcal`} />
      <Ring label="Burned" value={b} ratio={ratio(b, BURN_GOAL)} color="stroke-flame" delay={0.08} title={`Burned: ${fmt(b)} kcal from exercise`} />
      <Ring
        label={over ? "Over" : "Left"}
        value={Math.abs(left)}
        ratio={ratio(Math.abs(left), g)}
        color={over ? "stroke-flame" : "stroke-butter"}
        delay={0.16}
        title={over ? `${fmt(-left)} kcal over your goal` : `${fmt(left)} kcal left`}
      />
    </Card>
  );
}

function Ring({ label, value, ratio: r, color, delay = 0, title }: { label: string; value: number; ratio: number; color: string; delay?: number; title: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ProgressRing value={r} size={78} stroke={8} cap="butt" colorClass={color} trackSrc={TRACK} delay={delay} label={title}>
        <CountUp value={value} className="text-base font-semibold leading-[normal] text-ink" />
        <span className="text-micro leading-[normal] text-ink-soft">kcal</span>
      </ProgressRing>
      <span className="text-xs font-medium leading-[normal] text-ink-soft">{label}</span>
    </div>
  );
}
