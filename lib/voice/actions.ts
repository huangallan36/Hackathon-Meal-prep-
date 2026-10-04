"use client";

/**
 * Executes Gemini's function calls (and the local quick intents) against the app:
 * navigation through the registered router, cooking progress through useKitchen.
 * Returns text to speak INSTEAD of the model's reply when the action has its own
 * answer (e.g. the step it just moved to).
 */
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { Recipe, SousAction, SousActionName } from "@/lib/types";
import { getCurrentPath, navigateTo } from "./context";
import { stepSpeech } from "./speech-text";

const KNOWN: ReadonlySet<SousActionName> = new Set<SousActionName>([
  "open_fridge_camera",
  "show_recipes",
  "start_cooking",
  "show_groceries",
  "log_meal",
  "next_step",
  "previous_step",
  "repeat_step",
]);

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

async function applyOne(action: SousAction): Promise<string | null> {
  const id = validId(action.args?.recipeId);
  switch (action.name) {
    case "open_fridge_camera":
      navigateTo("/ai/fridge");
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
