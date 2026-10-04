"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { Chip } from "@/components/ui/Chip";
import { stepTimers } from "@/lib/cooking/durations";
import { ingredientsInStep } from "@/lib/cooking/stepIngredients";
import { splitStep } from "@/lib/cooking/steps";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { COOK_ICON } from "./icons";
import { TimerChip, TimerChips } from "./TimerChips";
import { TutorialCard } from "./TutorialCard";

type State = "done" | "current" | "upcoming";

/** Room above a step when it is scrolled into view: the sticky header (40px + 6px top + 8px bottom) and a little air */
export const STEP_SCROLL_MARGIN = "scroll-mt-[calc(var(--safe-top)+70px)]";

/**
 * Figma 2.3 step list: a timeline of 30px badges joined by a 2px line.
 * Done steps are struck through, the current one is expanded (Fraunces headline, detail,
 * tutorial, timers) and upcoming ones offer their timer. Tapping any other step jumps to it.
 * Renders purely from `current`, so voice commands that move the step animate like taps.
 */
export function StepTimeline({
  recipe,
  current,
  onJump,
  pulse = 0,
  className,
}: {
  recipe: Recipe;
  /** Current step; steps.length when every step is done */
  current: number;
  onJump: (index: number) => void;
  /** Bumps when the step is read again, to flash the headline */
  pulse?: number;
  className?: string;
}) {
  const total = recipe.steps.length;
  return (
    <ol className={cn("flex flex-col px-5", className)} aria-label="Steps">
      {recipe.steps.map((step, i) => {
        const state: State = i < current ? "done" : i === current ? "current" : "upcoming";
        const last = i === total - 1;
        return state === "current" ? (
          <CurrentStep key={i} recipe={recipe} index={i} last={last} pulse={pulse} />
        ) : (
          <OtherStep key={i} recipe={recipe} index={i} state={state} last={last} onJump={onJump} />
        );
      })}
    </ol>
  );
}

/** 30px badge + the 2px connector down to the next step */
function Rail({ state, number, last }: { state: State; number: number; last: boolean }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1 self-stretch" aria-hidden>
      <span
        // Re-mount on state change so the new badge pops in
        key={state}
        className={cn(
          "flex size-[30px] shrink-0 items-center justify-center rounded-full text-meta font-bold leading-[normal] animate-pop",
          state === "done" && "bg-accent",
          state === "current" && "bg-butter text-white",
          state === "upcoming" && "border-[1.5px] border-line bg-surface text-ink-soft",
        )}
      >
        {state === "done" ? <img src={COOK_ICON.check} alt="" width={16} height={16} className="block size-4" /> : number}
      </span>
      {!last && <span className="min-h-px w-0.5 flex-1 rounded-[1px] bg-line" />}
    </div>
  );
}

function CurrentStep({ recipe, index, last, pulse }: { recipe: Recipe; index: number; last: boolean; pulse: number }) {
  const step = recipe.steps[index];
  const { title, detail } = splitStep(step.text);
  const timers = useMemo(() => stepTimers(step), [step]);
  const used = useMemo(() => ingredientsInStep(step.text, recipe.ingredients), [step.text, recipe.ingredients]);

  return (
    <li id={`cook-step-${index}`} aria-current="step" className={cn("flex gap-3.5", STEP_SCROLL_MARGIN)}>
      <Rail state="current" number={index + 1} last={last} />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex min-w-0 flex-1 flex-col items-start gap-2 pb-[22px] pt-1"
      >
        <motion.p
          key={pulse}
          initial={pulse ? { opacity: 0.35 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full text-pretty font-display text-[19px] font-semibold leading-[normal] text-ink"
        >
          <span className="sr-only">{`Step ${index + 1}: `}</span>
          {title}
        </motion.p>
        {detail && <p className="w-full text-sm leading-[1.4] text-ink-soft">{detail}</p>}
        {used.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="You'll need">
            {used.map((ing) => (
              <li key={ing.original}>
                <Chip size="sm">{ing.original}</Chip>
              </li>
            ))}
          </ul>
        )}
        <TutorialCard recipe={recipe} />
        <TimerChips timers={timers} />
      </motion.div>
    </li>
  );
}

function OtherStep({
  recipe,
  index,
  state,
  last,
  onJump,
}: {
  recipe: Recipe;
  index: number;
  state: Exclude<State, "current">;
  last: boolean;
  onJump: (index: number) => void;
}) {
  const step = recipe.steps[index];
  const { title } = splitStep(step.text);
  const timer = state === "upcoming" ? stepTimers(step)[0] : undefined;

  return (
    <li id={`cook-step-${index}`} className={cn("relative flex gap-3.5", STEP_SCROLL_MARGIN)}>
      <Rail state={state} number={index + 1} last={last} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2 pb-[22px] pt-1">
        <button
          type="button"
          onClick={() => onJump(index)}
          aria-label={`Go to step ${index + 1}${state === "done" ? " (done)" : ""}: ${title}`}
          className={cn(
            "w-full text-left text-base font-medium leading-[normal] focus-visible:outline-none",
            // Stretched over the whole row (badge included); the timer pill sits above it
            "after:absolute after:-inset-x-2 after:inset-y-0 after:rounded-tile after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-accent",
            "hover:after:bg-ink/[0.03] active:after:bg-ink/[0.05]",
            state === "done" ? "line-clamp-2 text-ink-soft line-through decoration-from-font" : "text-ink",
          )}
        >
          {title}
        </button>
        {timer && <TimerChip timer={timer} className="z-10" />}
      </div>
    </li>
  );
}
