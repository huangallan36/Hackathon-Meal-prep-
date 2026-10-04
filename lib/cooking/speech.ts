/**
 * What Sous says in cooking mode. Kept separate from the UI so the lines are easy to tune
 * and read naturally through TTS (units spelled out, no symbols).
 */
import type { Recipe } from "@/lib/types";

const UNIT_WORDS: [RegExp, string][] = [
  [/(\d)\s*°\s*F\b/g, "$1 degrees Fahrenheit"],
  [/(\d)\s*°\s*C\b/g, "$1 degrees Celsius"],
  [/(\d)\s*°/g, "$1 degrees"],
  [/\btbsps?\b\.?/gi, "tablespoons"],
  [/\bTbs\b\.?/g, "tablespoons"],
  [/\btsps?\b\.?/gi, "teaspoons"],
  [/\boz\b\.?/gi, "ounces"],
  [/\blbs?\b\.?/gi, "pounds"],
  [/\bhrs?\b\.?/gi, "hours"],
  [/(\d)\s*mins?\b\.?/gi, "$1 minutes"],
  [/(\d)\s*secs?\b\.?/gi, "$1 seconds"],
  [/(\d)\s*g\b/g, "$1 grams"],
  [/(\d)\s*ml\b/gi, "$1 milliliters"],
  [/(\d)\s*["”]/g, "$1 inch"],
  [/(\d)\s*-\s*(\d)/g, "$1 to $2"],
  [/(\d)\s*½/g, "$1 and a half"],
  [/½/g, "half"],
  [/(\d)\s+1\/2\b/g, "$1 and a half"],
  [/\b1\/2\b/g, "half"],
  [/\b1\/4\b/g, "a quarter"],
  [/\b3\/4\b/g, "three quarters"],
  [/&/g, " and "],
  [/\s{2,}/g, " "],
];

/** Make recipe text pleasant to hear: spell out units and symbols ("350°F", "1/2 tsp") that TTS mangles. */
export function speakable(text: string): string {
  let out = text;
  for (const [re, rep] of UNIT_WORDS) out = out.replace(re, rep);
  return out.trim();
}

/** "Step 3 of 8. Add the garlic and cook for 1 minute." */
export function stepSpeech(recipe: Pick<Recipe, "steps">, index: number): string {
  const step = recipe.steps[index];
  if (!step) return "";
  return `Step ${index + 1} of ${recipe.steps.length}. ${speakable(step.text)}`;
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
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (!h) return plural(m, "minute");
  return m ? `${plural(h, "hour")} and ${plural(m, "minute")}` : plural(h, "hour");
}

export function timerStartSpeech(label: string, seconds: number): string {
  return `Okay, ${label.toLowerCase()} timer set for ${spokenDuration(seconds)}.`;
}
