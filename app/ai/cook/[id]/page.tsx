"use client";

import { ListChecks, SearchX } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CookSkeleton } from "@/components/cooking/CookSkeleton";
import { FinishCelebration } from "@/components/cooking/FinishCelebration";
import { IngredientsPanel } from "@/components/cooking/IngredientsPanel";
import { RecipeCredits, RecipeOverview } from "@/components/cooking/RecipeOverview";
import { StepCard } from "@/components/cooking/StepCard";
import { StepControls, VoiceHint } from "@/components/cooking/StepControls";
import { StepProgress } from "@/components/cooking/StepProgress";
import { HeaderTimer, TimerPill } from "@/components/cooking/TimerPill";
import { VideoTutorial } from "@/components/cooking/VideoTutorial";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  beginSteps,
  goToStepAndSay,
  nextOrFinish,
  previousStep,
  reopenSteps,
  repeatStep,
  restartRecipe,
} from "@/lib/cooking/actions";
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

function parseId(raw: string | string[] | undefined): number | null {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s || !/^\d{1,12}$/.test(s)) return null;
  const n = Number(s);
  return n > 0 ? n : null;
}

export default function CookPage() {
  const params = useParams<{ id: string }>();
  const recipeId = parseId(params?.id);
  const active = useKitchen((s) => s.activeRecipe);
  const recipe = active && active.id === recipeId ? active : null;
  const hasRecipe = recipe != null;
  const [failedId, setFailedId] = useState<number | null>(null);

  // Deep link or reload on a recipe that is not active yet: load it (cache first, then API).
  useEffect(() => {
    if (recipeId == null || hasRecipe) return;
    let cancelled = false;
    loadRecipe(recipeId)
      .then((r) => {
        if (cancelled) return;
        if (r) useKitchen.getState().startCooking(r);
        else setFailedId(recipeId);
      })
      .catch(() => {
        if (!cancelled) setFailedId(recipeId);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeId, hasRecipe]);

  if (recipeId == null || (failedId === recipeId && !recipe)) {
    return (
      <div className="pb-nav">
        <ScreenHeader back="/ai/recipes" title="Cooking mode" />
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Recipe not found"
          body="We couldn't load this recipe. Pick another one from your suggestions."
          action={<ButtonLink href="/ai/recipes">See recipes</ButtonLink>}
          className="mt-10"
        />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="pb-nav">
        <ScreenHeader back="/ai/recipes" />
        <CookSkeleton />
      </div>
    );
  }

  return <CookView recipe={recipe} />;
}

function CookView({ recipe }: { recipe: Recipe }) {
  const stepIndex = useKitchen((s) => s.stepIndex);
  const finished = useKitchen((s) => s.finishedRecipeId === recipe.id);
  const [showIngredients, setShowIngredients] = useState(false);
  const [pulse, setPulse] = useState(0);

  const total = recipe.steps.length;
  const index = Math.min(stepIndex, total - 1);
  // "done" only while on the last step, so a voice "go back" from the celebration shows that step again.
  const mode: "overview" | "step" | "done" = finished && total > 0 && index >= total - 1 ? "done" : index < 0 ? "overview" : "step";

  // New step or mode (by tap, key or voice): bring the start of it into view.
  useEffect(() => {
    document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode, index]);

  // Desktop demo convenience: Right/Space = next, Left = back. Reads the store, so it stays in sync with voice.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const k = useKitchen.getState();
      if (!recipe.steps.length || (k.finishedRecipeId === recipe.id && k.stepIndex >= recipe.steps.length - 1)) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        // Let Space press a focused button/link the normal way.
        if (e.key === " " && target?.closest("button, a")) return;
        e.preventDefault();
        if (k.stepIndex < 0) beginSteps(recipe);
        else nextOrFinish(recipe);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousStep(recipe);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recipe]);

  return (
    <div className="pb-nav">
      <ScreenHeader
        back="/ai/recipes"
        title={mode === "overview" ? undefined : recipe.title}
        subtitle={mode === "step" ? "Cooking mode" : mode === "done" ? "Finished" : undefined}
        right={
          <>
            <HeaderTimer />
            {mode === "step" && (
              <button
                type="button"
                aria-label={showIngredients ? "Hide ingredients" : "Show ingredients"}
                aria-pressed={showIngredients}
                onClick={() => setShowIngredients((v) => !v)}
                className={cn(
                  "inline-flex size-11 items-center justify-center rounded-full shadow-soft transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  showIngredients ? "bg-accent text-white" : "bg-surface text-ink hover:bg-cream-deep",
                )}
              >
                <ListChecks className="size-5" />
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-5 px-5 pt-1">
        <TimerPill />

        {mode === "overview" ? (
          <RecipeOverview recipe={recipe} onStart={() => beginSteps(recipe)} />
        ) : mode === "step" ? (
          <div className="flex flex-col gap-5">
            <StepProgress index={index} total={total} onJump={(j) => goToStepAndSay(recipe, j)} />
            <IngredientsPanel recipe={recipe} open={showIngredients} />
            <StepCard recipe={recipe} index={index} pulse={pulse} />
            <StepControls
              isLast={index >= total - 1}
              onBack={() => previousStep(recipe)}
              onRepeat={() => {
                setPulse((p) => p + 1);
                repeatStep(recipe);
              }}
              onNext={() => nextOrFinish(recipe)}
            />
            <VoiceHint className="-mt-2" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <StepProgress
              index={total - 1}
              total={total}
              done
              onJump={(j) => {
                reopenSteps(recipe);
                goToStepAndSay(recipe, j);
              }}
            />
            <FinishCelebration title={recipe.title} onBackToSteps={() => reopenSteps(recipe)} onStartOver={restartRecipe} />
          </div>
        )}

        {/* Same tree position in every mode, so a playing video survives Start / Finish. */}
        <VideoTutorial recipe={recipe} />
        <RecipeCredits recipe={recipe} />
      </div>
    </div>
  );
}
