/**
 * What Sous says in cooking mode. Lines stay in display form ("Bake at 350°F for 1 hr"):
 * the voice engine shows them as the caption and normalizes units, fractions and symbols
 * for TTS itself, so they are not pre-spelled here (that would double-process them).
 */
import type { Recipe } from "@/lib/types";

/** Trimmed, single-spaced, ending in punctuation so the next sentence doesn't run on */
function sentence(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** "Step 3 of 8. Add the garlic and cook for 1 minute." */
export function stepSpeech(recipe: Pick<Recipe, "steps">, index: number): string {
  const step = recipe.steps[index];
  if (!step) return "";
  return `Step ${index + 1} of ${recipe.steps.length}. ${sentence(step.text)}`;
}

export function startSpeech(recipe: Pick<Recipe, "title" | "steps">): string {
  return `Let's make ${recipe.title}. ${stepSpeech(recipe, 0)}`;
}

export function finishSpeech(title: string): string {
  return `Nice work, ${title} is done! Snap a photo of your plate and I'll estimate the nutrition for your diary.`;
}

export function timerDoneSpeech(label: string): string {
  return `Your ${label.toLowerCase()} timer is done.`;
}

/** 1200 -> "20 minutes", 5400 -> "1 hour and 30 minutes" */
export function spokenDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (s < 60) return plural(s, "second");
  const minutes = Math.round(s / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return plural(m, "minute");
  return m ? `${plural(h, "hour")} and ${plural(m, "minute")}` : plural(h, "hour");
}

export function timerStartSpeech(label: string, seconds: number): string {
  return `Okay, ${label.toLowerCase()} timer set for ${spokenDuration(seconds)}.`;
}
