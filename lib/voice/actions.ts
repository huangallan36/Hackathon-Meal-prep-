"use client";

/**
 * Executes Gemini's function calls (and the local quick intents) against the app:
 * navigation through the registered router, cooking progress through useKitchen.
 * Returns text to speak INSTEAD of the model's reply when the action has its own
 * answer (e.g. the step it just moved to).
 */
import { estimateFoods, logFoods } from "@/lib/diary/estimate";
import { dayTotals, MEAL_LABEL } from "@/lib/diary/stats";
import { loadRecipe } from "@/lib/recipes/client";
import { FRIDGE_SCAN_HREF } from "@/lib/kitchen/routes";
import { useDiary } from "@/lib/stores/diary";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { MealType, Recipe, SousAction, SousActionName } from "@/lib/types";
import { mealForNow, todayISO } from "@/lib/utils";
import { getCurrentPath, navigateTo } from "./context";
import { stepSpeech } from "./speech-text";

const KNOWN: ReadonlySet<SousActionName> = new Set<SousActionName>([
  "open_fridge_camera",
  "show_recipes",
  "start_cooking",
  "show_groceries",
  "log_meal",
  "log_food",
  "next_step",
  "previous_step",
  "repeat_step",
]);

const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export const LAST_STEP_LINE = "That was the last step! Snap a photo of your finished meal and I'll log it for you.";
export const NO_RECIPE_LINE = "Pick a recipe first and I'll walk you through it.";

function validId(id: unknown): number | null {
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
}

/** Step actions should be visible: open the cook screen if we're elsewhere. */
function showCookScreen(recipeId: number) {
  const href = `/ai/cook/${recipeId}`;
  if (getCurrentPath() !== href) navigateTo(href);
}

function speakStep(index: number): string {
  const r = useKitchen.getState().activeRecipe;
  if (!r) return NO_RECIPE_LINE;
  const i = Math.max(0, Math.min(index, r.steps.length - 1));
  return stepSpeech(r.steps[i], i, r.steps.length);
}

function nextStep(): string {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return NO_RECIPE_LINE;
  showCookScreen(r.id);
  if (k.stepIndex < 0) {
    k.goToStep(0);
    return speakStep(0);
  }
  if (k.stepIndex >= r.steps.length - 1) {
    if (k.finishedRecipeId !== r.id) k.finishCooking();
    return LAST_STEP_LINE;
  }
  k.nextStep();
  return speakStep(useKitchen.getState().stepIndex);
}

/** The "Nice work, snap your meal" card is showing (finished, still on the last step). */
function onFinishCard(): boolean {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  return !!r && k.finishedRecipeId === r.id && k.stepIndex >= r.steps.length - 1;
}

function previousStep(): string {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return NO_RECIPE_LINE;
  showCookScreen(r.id);
  // From the finish card, "go back" means the last step (the card counts as one more step).
  if (onFinishCard()) {
    const last = r.steps.length - 1;
    useKitchen.setState({ finishedRecipeId: null, stepIndex: last });
    return speakStep(last);
  }
  if (k.stepIndex < 0) return "We're at the start. Say next when you're ready to begin.";
  if (k.stepIndex === 0) return `We're at the start. ${speakStep(0)}`;
  k.prevStep();
  return speakStep(useKitchen.getState().stepIndex);
}

function repeatStep(): string {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return NO_RECIPE_LINE;
  showCookScreen(r.id);
  // On the finish card the last thing Sous said was the wrap-up, so say that again.
  if (onFinishCard()) return LAST_STEP_LINE;
  if (k.stepIndex < 0) {
    k.goToStep(0);
    return speakStep(0);
  }
  return speakStep(k.stepIndex);
}

async function startCooking(recipeId: number | null): Promise<void> {
  const k = useKitchen.getState();
  const id = recipeId ?? (k.matches.length === 1 ? k.matches[0].recipe.id : null);
  if (id == null) {
    navigateTo("/ai/recipes");
    return;
  }
  let recipe: Recipe | null = null;
  try {
    recipe = await loadRecipe(id);
  } catch {
    recipe = null;
  }
  if (!recipe || !recipe.steps.length) {
    toast("Couldn't open that recipe. Pick one here?", "warning");
    navigateTo("/ai/recipes");
    return;
  }
  useKitchen.getState().startCooking(recipe);
  navigateTo(`/ai/cook/${recipe.id}`);
}

function showGroceries(recipeId: number | null) {
  const k = useKitchen.getState();
  const id = recipeId ?? k.activeRecipe?.id ?? k.matches[0]?.recipe.id ?? null;
  navigateTo(id == null ? "/ai/recipes" : `/ai/groceries/${id}`);
}

function logMeal() {
  const k = useKitchen.getState();
  if (k.activeRecipe && k.finishedRecipeId !== k.activeRecipe.id) k.finishCooking();
  navigateTo("/ai/snap");
}

/** "1,420" (TTS voices read grouped digits naturally; no symbols) */
const count = (n: number) => Math.round(n).toLocaleString("en-US");

/** "chicken wrap and latte", "eggs, toast and orange juice" (lowercase, no leading article) */
function spokenList(names: string[]): string {
  const clean = names.map((n) => n.toLowerCase().replace(/^(?:a|an|the|some)\s+/, "").replace(/[^a-z0-9 '-]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "food";
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/**
 * Spoken food logging: estimate what they described, log it to today's diary under the
 * named meal (else the one that fits the time), open the day and answer with a short
 * summary. Never throws; every failure ends in a friendly line.
 */
async function logFood(description: unknown, meal: unknown): Promise<string> {
  const text = typeof description === "string" ? description.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  const today = todayISO();
  if (!text) {
    navigateTo(`/diary/${today}`);
    return "Tell me what you had, like a chicken wrap and a latte, and I'll log it.";
  }
  const slot: MealType = MEALS.includes(meal as MealType) ? (meal as MealType) : mealForNow();
  try {
    const { items } = await estimateFoods(text, slot);
    if (!items.length) return "Hmm, I couldn't tell what you had. Try again, like two eggs and toast.";
    const logged = logFoods(items, slot, today);
    if (!logged.length) return "Sorry, I couldn't save that to your diary. Try again?";
    navigateTo(`/diary/${today}`);
    toast(`Added to ${MEAL_LABEL[slot]}`, "success");
    const kcal = logged.reduce((sum, e) => sum + (e.nutrition.calories || 0), 0);
    const dayKcal = dayTotals(useDiary.getState().entries, today).totals.calories;
    const what = logged.length > 3 ? `${logged.length} things for ${slot === "snack" ? "a snack" : slot}` : `your ${spokenList(logged.map((e) => e.name))}`;
    return `Logged ${what}, about ${count(kcal)} calories. That's ${count(dayKcal)} for today.`;
  } catch (err) {
    console.warn("[voice] log_food failed:", err instanceof Error ? err.message : err);
    return "Sorry, I couldn't log that right now. You can add it from your diary.";
  }
}

async function applyOne(action: SousAction): Promise<string | null> {
  const id = validId(action.args?.recipeId);
  switch (action.name) {
    case "open_fridge_camera":
      navigateTo(FRIDGE_SCAN_HREF);
      return null;
    case "show_recipes":
      navigateTo("/ai/recipes");
      return null;
    case "start_cooking":
      await startCooking(id);
      return null;
    case "show_groceries":
      showGroceries(id);
      return null;
    case "log_meal":
      logMeal();
      return null;
    case "next_step":
      return nextStep();
    case "previous_step":
      return previousStep();
    case "repeat_step":
      return repeatStep();
    case "log_food":
      return logFood(action.args?.description, action.args?.meal);
  }
}

/**
 * Run actions in order. Unknown or malformed actions are skipped; one failing action
 * never stops the rest. Resolves with the override line (the last one wins) or null.
 */
export async function applyActions(actions: SousAction[] | undefined | null): Promise<string | null> {
  if (!Array.isArray(actions)) return null;
  let override: string | null = null;
  for (const action of actions.slice(0, 4)) {
    if (!action || typeof action !== "object" || !KNOWN.has(action.name)) continue;
    try {
      const line = await applyOne(action);
      if (line) override = line;
    } catch (err) {
      console.warn("[voice] action failed:", action.name, err instanceof Error ? err.message : err);
    }
  }
  return override;
}
