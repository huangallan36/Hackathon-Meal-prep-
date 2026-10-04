"use client";

import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import type { NutrientInsight } from "@/lib/diary/insight";
import { cn } from "@/lib/utils";
import { usePersona } from "@/lib/voice/persona";

const pill =
  "relative inline-flex items-center rounded-pill px-3 py-2 text-meta leading-[normal] transition after:absolute after:-inset-y-1.5 after:inset-x-0 after:content-[''] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/** Figma 3.2 green Sous card: the week's nutrient tip with "Plan it for me" / "Not now" */
export function NutrientInsightCard({
  insight,
  onDismiss,
  className,
  style,
}: {
  insight: NutrientInsight;
  onDismiss: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const router = useRouter();
  const persona = usePersona();
  // The design's orb is Maya's; the other sous-chefs show their own.
  const orb = persona.id === "maya" ? "/figma/screens/2-157/voice-orb.svg" : persona.orb;

  function plan() {
    router.push(insight.query ? `/planner?q=${encodeURIComponent(insight.query)}` : "/planner");
  }

  return (
    <section aria-label={`Tip from ${persona.name}`} className={cn("flex flex-col gap-3 rounded-card bg-accent p-4", className)} style={style}>
      <div className="flex items-start gap-3">
        <img src={orb} alt="" width={36} height={36} className="block size-9 shrink-0" />
        <p className="min-w-0 flex-1 text-sm leading-[1.4] text-white">{insight.text}</p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <button type="button" onClick={plan} className={cn(pill, "gap-1.5 bg-surface font-semibold text-accent hover:bg-cream")}>
          <img src="/figma/screens/2-157/icon-sparkle.svg" alt="" width={14} height={14} className="block size-3.5 shrink-0" />
          Plan it for me
        </button>
        <button type="button" onClick={onDismiss} className={cn(pill, "bg-white/14 font-medium text-white hover:bg-white/20")}>
          Not now
        </button>
      </div>
    </section>
  );
}
