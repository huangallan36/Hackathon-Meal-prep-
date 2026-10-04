"use client";

import { Camera, ExternalLink, ListChecks, LogOut, RotateCcw, SearchX, ShoppingBasket, Volume2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CookMenu, type CookMenuItem } from "@/components/cooking/CookMenu";
import { COOK_PROGRESS_STICKY, CookProgress } from "@/components/cooking/CookProgress";
import { CookSheet, sheetPrimaryClass } from "@/components/cooking/CookSheet";
import { CookSkeleton } from "@/components/cooking/CookSkeleton";
import { FinishCelebration } from "@/components/cooking/FinishCelebration";
import { COOK_ICON } from "@/components/cooking/icons";
import { IngredientsPanel } from "@/components/cooking/IngredientsPanel";
import { RecipeCredits, RecipeOverview } from "@/components/cooking/RecipeOverview";
import { StepTimeline } from "@/components/cooking/StepTimeline";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  beginSteps,
  clearStaleFinish,
  goToStepAndSay,
  nextOrFinish,
  previousStep,
  reopenSteps,
  repeatStep,
  restartRecipe,
} from "@/lib/cooking/actions";
import { minutesLeft } from "@/lib/cooking/durations";
import { loadRecipe } from "@/lib/recipes/client";
import { useDock } from "@/lib/stores/dock";
import { useKitchen } from "@/lib/stores/kitchen";
import type { Recipe } from "@/lib/types";

const BACK_HREF = "/ai/recipes";

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
      <div className="pb-10">
        <ScreenHeader back={BACK_HREF} eyebrow="Cooking mode" />
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="Recipe not found"
          body="We couldn't load this recipe. Pick another one from your suggestions."
          action={<ButtonLink href={BACK_HREF}>See recipes</ButtonLink>}
          className="mt-10"
        />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="pb-10">
        <ScreenHeader back={BACK_HREF} eyebrow="Cooking mode" />
        <CookSkeleton />
      </div>
    );
  }

  return <CookView recipe={recipe} />;
}

/** Figma 2.3 eyebrow: 12px SemiBold, 0.72px tracking */
const EYEBROW = <span className="font-semibold tracking-[0.72px]">Cooking mode</span>;

function CookView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const stepIndex = useKitchen((s) => s.stepIndex);
  const finished = useKitchen((s) => s.finishedRecipeId === recipe.id);
  const [showIngredients, setShowIngredients] = useState(false);
  const [pulse, setPulse] = useState(0);

  const total = recipe.steps.length;
  const index = Math.min(stepIndex, total - 1);
  const isLast = index >= total - 1;
  // "done" only while on the last step, so a voice "go back" from the celebration shows that step again.
  const mode: "overview" | "step" | "done" = finished && total > 0 && isLast ? "done" : index < 0 ? "overview" : "step";
  const left = useMemo(() => (mode === "step" ? minutesLeft(recipe, index) : undefined), [mode, recipe, index]);

  // New step or mode (by tap, key or voice): bring it into view, with the step before it peeking above.
  useEffect(() => {
    const scroller = document.getElementById("sous-scroll");
    const anchor = mode === "step" && index >= 2 ? document.getElementById(`cook-step-${index - 1}`) : null;
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    else scroller?.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode, index]);

  // Voice "go back" from the celebration leaves finishedRecipeId set: clear it so Next shows the last step again.
  const staleFinish = finished && index < total - 1;
  useEffect(() => {
    if (staleFinish) clearStaleFinish(recipe);
  }, [staleFinish, recipe]);

  // Desktop demo convenience: Right/Space = next, Left = back. Reads the store, so it stays in sync with voice.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
      // Sous is docked over the (demo) home screen: this screen is in the background.
      if (useDock.getState().docked) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      // Arrow keys move through the open "more" menu instead.
      if (target?.closest("[role=menu]")) return;
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

  function toggleIngredients() {
    const opening = !showIngredients;
    setShowIngredients(opening);
    if (opening) document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  const menu: CookMenuItem[] = [
    ...(mode !== "overview"
      ? [{ label: showIngredients ? "Hide ingredients" : "View ingredients", icon: <ListChecks />, onSelect: toggleIngredients }]
      : []),
    ...(mode === "step"
      ? [
          {
            label: "Repeat step",
            icon: <Volume2 />,
            onSelect: () => {
              setPulse((p) => p + 1);
              repeatStep(recipe);
            },
          },
        ]
      : []),
    { label: "Groceries", icon: <ShoppingBasket />, onSelect: () => router.push(`/ai/groceries/${recipe.id}`) },
    ...(mode !== "overview" ? [{ label: "Restart", icon: <RotateCcw />, onSelect: restartRecipe }] : []),
    { label: "Exit cooking", icon: <LogOut />, onSelect: () => router.push("/ai") },
  ];

  const jump = (j: number) => {
    if (mode === "done") reopenSteps(recipe);
    goToStepAndSay(recipe, j);
  };

  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        back={BACK_HREF}
        eyebrow={mode === "overview" ? undefined : EYEBROW}
        title={mode === "overview" ? undefined : recipe.title}
        right={<CookMenu items={menu} />}
      />

      {mode === "overview" ? (
        <RecipeOverview recipe={recipe} />
      ) : (
        <div className="flex flex-col pb-4">
          <CookProgress index={index} total={total} done={mode === "done"} minutesLeft={left} className={COOK_PROGRESS_STICKY} />
          <IngredientsPanel recipe={recipe} open={showIngredients} onClose={() => setShowIngredients(false)} />
          {mode === "done" && (
            <div className="pt-[10px]">
              <FinishCelebration title={recipe.title} onBackToSteps={() => reopenSteps(recipe)} onStartOver={restartRecipe} />
            </div>
          )}
          <StepTimeline
            recipe={recipe}
            current={mode === "done" ? total : index}
            onJump={jump}
            pulse={pulse}
            className={mode === "done" ? "pt-6" : "pt-[10px]"}
          />
          <RecipeCredits recipe={recipe} />
        </div>
      )}

      {mode === "overview" ? (
        <CookSheet>
          {total > 0 ? (
            <button type="button" onClick={() => beginSteps(recipe)} className={sheetPrimaryClass}>
              Start cooking
              <img src={COOK_ICON.next} alt="" width={18} height={18} className="block size-[18px]" />
            </button>
          ) : recipe.sourceUrl ? (
            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className={sheetPrimaryClass}>
              <ExternalLink className="size-5" />
              Open full recipe
            </a>
          ) : (
            <Link href={BACK_HREF} className={sheetPrimaryClass}>
              Other recipes
            </Link>
          )}
        </CookSheet>
      ) : mode === "step" ? (
        <CookSheet onBack={() => previousStep(recipe)} backLabel={index === 0 ? "Back to overview" : "Previous step"}>
          <button type="button" onClick={() => nextOrFinish(recipe)} className={sheetPrimaryClass}>
            {isLast ? "Finish" : "Next step"}
            <img
              src={isLast ? COOK_ICON.check : COOK_ICON.next}
              alt=""
              width={isLast ? 16 : 18}
              height={isLast ? 16 : 18}
              className={isLast ? "block size-4" : "block size-[18px]"}
            />
          </button>
        </CookSheet>
      ) : (
        <CookSheet onBack={() => reopenSteps(recipe)} backLabel="Back to the last step">
          <Link href="/ai/snap" className={sheetPrimaryClass}>
            <Camera className="size-5" />
            Snap your meal
          </Link>
        </CookSheet>
      )}
    </div>
  );
}
