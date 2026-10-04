"use client";

/**
 * Cooking-mode actions shared by the buttons, the keyboard shortcuts and the timer UI.
 * They read and write the kitchen store directly, so voice commands (which also move
 * stepIndex) and taps always act on the same state.
 */
import { useKitchen, type KitchenTimer } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { Recipe } from "@/lib/types";
import { speak } from "@/lib/voice/engine";
import { buzz, playChime, primeChime } from "./chime";
import { finishSpeech, startSpeech, stepSpeech, timerDoneSpeech, timerStartSpeech } from "./speech";

/** Fire-and-forget speech that never surfaces a rejection */
export function say(text: string): void {
  if (!text) return;
  try {
    speak(text, { onlyIfSession: true }).catch(() => {});
  } catch {
    /* voice is optional */
  }
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

export function beginSteps(recipe: Recipe): void {
  useKitchen.getState().goToStep(0);
  say(startSpeech(recipe));
}

export function goToStepAndSay(recipe: Recipe, index: number): void {
  const k = useKitchen.getState();
  k.goToStep(index);
  const i = useKitchen.getState().stepIndex;
  if (i >= 0) say(stepSpeech(recipe, i));
}

export function nextOrFinish(recipe: Recipe): void {
  const k = useKitchen.getState();
  if (k.stepIndex >= recipe.steps.length - 1) {
    finishRecipe(recipe);
    return;
  }
  if (k.nextStep()) say(stepSpeech(recipe, useKitchen.getState().stepIndex));
}

export function previousStep(recipe: Recipe): void {
  const k = useKitchen.getState();
  if (k.stepIndex < 0) return;
  k.prevStep();
  const i = useKitchen.getState().stepIndex;
  if (i >= 0) say(stepSpeech(recipe, i));
}

export function repeatStep(recipe: Recipe): void {
  const i = useKitchen.getState().stepIndex;
  if (i >= 0) say(stepSpeech(recipe, i));
}

export function finishRecipe(recipe: Recipe): void {
  useKitchen.getState().finishCooking();
  say(finishSpeech(recipe.title));
}

/** Leave the "Nice work!" card and go back to the last step */
export function reopenSteps(recipe: Recipe): void {
  useKitchen.setState({ finishedRecipeId: null, stepIndex: Math.max(0, recipe.steps.length - 1) });
}

/**
 * Called when the store says "finished" but the step is no longer the last one (a voice
 * "go back" from the celebration moves stepIndex without clearing the flag). Without this,
 * the next tap on Next would jump straight back to the celebration and skip the last step.
 */
export function clearStaleFinish(recipe: Recipe): void {
  const k = useKitchen.getState();
  if (k.finishedRecipeId === recipe.id && k.stepIndex < recipe.steps.length - 1) {
    useKitchen.setState({ finishedRecipeId: null });
  }
}

/** Cook the same recipe again from the overview */
export function restartRecipe(): void {
  useKitchen.setState({ finishedRecipeId: null, stepIndex: -1, cookStartedAt: Date.now() });
}

/* ------------------------------------------------------------------ */
/* Timer                                                               */
/* ------------------------------------------------------------------ */

export function startTimer(seconds: number, label: string): void {
  primeChime();
  const totalSec = Math.max(1, Math.round(seconds));
  useKitchen.getState().setTimer({ endsAt: Date.now() + totalSec * 1000, totalSec, label });
  say(timerStartSpeech(label, totalSec));
}

/** +1 minute; on a finished timer it restarts a fresh one-minute countdown */
export function addMinute(): void {
  primeChime();
  const t = useKitchen.getState().timer;
  if (!t) return;
  const now = Date.now();
  const next: KitchenTimer = t.doneAt
    ? { endsAt: now + 60_000, totalSec: 60, label: t.label }
    : { endsAt: Math.max(t.endsAt, now) + 60_000, totalSec: t.totalSec + 60, label: t.label };
  useKitchen.getState().setTimer(next);
}

export function cancelTimer(): void {
  useKitchen.getState().setTimer(null);
}

/** Clamped to totalSec so a stale clock reading right after Start never shows more than the timer's length */
export function remainingSeconds(timer: KitchenTimer, now: number): number {
  return Math.min(timer.totalSec, Math.max(0, (timer.endsAt - now) / 1000));
}

/** Ring once: chime, vibrate, toast, Sous says it. Marks doneAt so a reload does not ring again. */
export function ringTimer(timer: KitchenTimer): void {
  const current = useKitchen.getState().timer;
  if (!current || current.endsAt !== timer.endsAt || current.doneAt) return;
  useKitchen.getState().setTimer({ ...current, doneAt: Date.now() });
  playChime();
  buzz();
  toast(`Timer done: ${current.label}`, "success", 5000);
  say(timerDoneSpeech(current.label));
}
