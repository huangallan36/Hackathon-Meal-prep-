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
import { CHEAPEST_STORE, formatDollars, groceryKey, groceryPlan, NEARBY_STORES, storeEstimate } from "@/lib/kitchen/groceries";
import { FRIDGE_SCAN_HREF } from "@/lib/kitchen/routes";
import { useDiary } from "@/lib/stores/diary";
import { useKitchen } from "@/lib/stores/kitchen";
import { useMapView } from "@/lib/stores/map";
import { useVideo } from "@/lib/stores/video";
import { toast } from "@/lib/stores/toast";
import type { AppScreen, MealType, Recipe, SousAction, SousActionName } from "@/lib/types";
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
  "go_to_step",
  "open_screen",
  "search_recipes",
  "show_video",
  "open_map",
]);

const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/** Where open_screen goes */
const SCREEN_HREF: Record<AppScreen, string> = {
  home: "/ai",
  planner: "/planner",
  diary: "/diary",
  calendar: "/diary/calendar",
  nutrients: "/me/nutrients",
  profile: "/me",
  social: "/social",
};

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

/** "Go to step five": open that step (1-based) and read it */
function goToStep(step: unknown): string {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return NO_RECIPE_LINE;
  const n = typeof step === "number" && Number.isInteger(step) ? step : NaN;
  if (!(n >= 1)) return speakStep(Math.max(0, k.stepIndex));
  if (n > r.steps.length) return `This one only has ${r.steps.length} steps. Which one do you want?`;
  showCookScreen(r.id);
  // Jumping back from the finish card reopens the steps.
  if (k.finishedRecipeId === r.id) useKitchen.setState({ finishedRecipeId: null });
  k.goToStep(n - 1);
  return speakStep(n - 1);
}

/**
 * Play the recipe's video inside cooking mode (the tutorial card on the current step shows the
 * player), or close it. Not started yet: step one opens so there's a card to play it on.
 */
function showVideo(hide: unknown): string | null {
  if (hide === true) {
    useVideo.getState().hide();
    return null;
  }
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r) return "Pick a recipe first and I'll pull up its video.";
  if (!r.youtubeId) return `Sorry, I don't have a video for ${r.title}.`;
  showCookScreen(r.id);
  if (k.finishedRecipeId === r.id) useKitchen.setState({ finishedRecipeId: null });
  if (k.stepIndex < 0) k.goToStep(0);
  useVideo.getState().show(r.id, useKitchen.getState().stepIndex);
  return null;
}

/** The in-app map for a store named by voice ("Walmart"), else the cheapest one */
function openMap(name: unknown): void {
  const wanted = typeof name === "string" ? name.toLowerCase().trim() : "";
  const byName = wanted
    ? NEARBY_STORES.findIndex((s) => s.name.toLowerCase().includes(wanted) || wanted.includes(s.short.toLowerCase()))
    : -1;
  const nearest = /\b(closest|nearest)\b/.test(wanted) ? 0 : -1;
  useMapView.getState().open(byName >= 0 ? byName : nearest >= 0 ? nearest : CHEAPEST_STORE);
}

/** Planner search for a dish or ingredient (the planner opens straight into the results) */
function searchRecipes(query: unknown) {
  const q = typeof query === "string" ? query.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  navigateTo(q ? `/planner?q=${encodeURIComponent(q)}` : "/planner");
}

/**
 * Bring the grocery screen's "Nearby stores" into view. The screen may still be loading after
 * a navigation (and the shell scrolls new screens to the top), so look for it for a moment.
 */
function scrollToStores() {
  if (typeof document === "undefined") return;
  let tries = 0;
  const tick = () => {
    const el = document.getElementById("nearby-stores");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (++tries < 25) setTimeout(tick, 120);
  };
  setTimeout(tick, 250);
}

async function startCooking(recipeId: number | null): Promise<string | null> {
  const k = useKitchen.getState();
  const id = recipeId ?? (k.matches.length === 1 ? k.matches[0].recipe.id : null);
  if (id == null) {
    navigateTo("/ai/recipes");
    return null;
  }
  // Already open (its overview, its shopping list, or mid-cook): "let's cook" means the steps.
  // Re-opening it would reset it to the overview, which is where people got stuck.
  const open = k.activeRecipe;
  const seen = getCurrentPath() === `/ai/cook/${id}` || getCurrentPath() === `/ai/groceries/${id}` || groceriesOffered.has(id);
  if (open?.id === id && open.steps.length && (seen || k.stepIndex >= 0)) return beginOrResume();
  let recipe: Recipe | null = null;
  try {
    recipe = await loadRecipe(id);
  } catch {
    recipe = null;
  }
  if (!recipe || !recipe.steps.length) {
    toast("Couldn't open that recipe. Pick one here?", "warning");
    navigateTo("/ai/recipes");
    return null;
  }
  useKitchen.getState().startCooking(recipe);
  // Missing ingredients (per the fridge scan): first show where to get them. Saying "let's
  // cook" again for the same recipe goes to the stove.
  const missing = missingFor(recipe);
  if (missing.length > 0 && !groceriesOffered.has(recipe.id) && getCurrentPath() !== `/ai/groceries/${recipe.id}`) {
    groceriesOffered.add(recipe.id);
    navigateTo(`/ai/groceries/${recipe.id}`);
    scrollToStores();
    return groceriesLine(recipe, missing);
  }
  navigateTo(`/ai/cook/${recipe.id}`);
  return ingredientsLine(recipe);
}

/**
 * What Sous says when a recipe opens: what it takes. "Beef Teriyaki, twenty-five minutes. You'll
 * need flank steak, soy sauce, honey and ginger, plus pantry basics. You've got all of it."
 */
function ingredientsLine(recipe: Recipe): string {
  const k = useKitchen.getState();
  const main = groceryPlan(recipe, k.ingredients);
  const items = [...main.have, ...main.need].map((i) => i.name);
  const shown = items.slice(0, 6);
  const list = shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : (shown[0] ?? "");
  const extra = items.length > 6 ? `, ${items.length - 6} more` : "";
  const pantry = main.pantry.length ? ", plus pantry basics" : "";
  const intro = `${recipe.title}, about ${recipe.readyInMinutes} minutes.`;
  const need = list ? ` You'll need ${list}${extra}${pantry}.` : "";
  const have = main.noScan ? "" : main.need.length === 0 ? " You've got all of it." : "";
  return `${intro}${need}${have} Say next when you're ready for step one.`;
}

/** Into the steps of the open recipe: step one if not started, else where they left off */
function beginOrResume(): string {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return NO_RECIPE_LINE;
  if (k.finishedRecipeId === r.id) useKitchen.setState({ finishedRecipeId: null });
  if (k.stepIndex < 0) k.goToStep(0);
  showCookScreen(r.id);
  return speakStep(Math.max(0, useKitchen.getState().stepIndex));
}

/** Recipes whose missing ingredients Sous already pointed out this session */
const groceriesOffered = new Set<number>();

/** What's still to buy for a recipe; empty without a fridge scan (we don't know what they have) */
function missingFor(recipe: Recipe) {
  const k = useKitchen.getState();
  if (k.ingredients.length === 0) return [];
  return groceryPlan(recipe, k.ingredients).need.filter((i) => !k.groceryChecked[groceryKey(recipe.id, i.name)]);
}

/** "You're missing soy sauce and green onions. Superstore has them for about $16.95, ..." */
function groceriesLine(recipe: Recipe, missing: ReturnType<typeof missingFor>): string {
  const names = missing.slice(0, 3).map((i) => i.name);
  const more = missing.length > 3 ? ` and ${missing.length - 3} more` : "";
  const list = names.length > 1 && !more ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : `${names.join(", ")}${more}`;
  const cheap = NEARBY_STORES[CHEAPEST_STORE];
  const near = NEARBY_STORES[0];
  const where =
    cheap === near
      ? `${cheap.short} has it all for about ${formatDollars(storeEstimate(cheap, missing))}.`
      : `${cheap.short} has it all for about ${formatDollars(storeEstimate(cheap, missing))}, or ${near.short} is closest.`;
  return `${recipe.title} sounds great, but you're missing ${list}. ${where} Say let's cook when you're ready.`;
}

function showGroceries(recipeId: number | null, section?: unknown) {
  const k = useKitchen.getState();
  const id = recipeId ?? k.activeRecipe?.id ?? k.matches[0]?.recipe.id ?? null;
  navigateTo(id == null ? "/ai/recipes" : `/ai/groceries/${id}`);
  if (id != null && section === "stores") scrollToStores();
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
    navigateTo("/diary");
    return "Tell me what you had, like a chicken wrap and a latte, and I'll log it.";
  }
  const slot: MealType = MEALS.includes(meal as MealType) ? (meal as MealType) : mealForNow();
  try {
    const { items } = await estimateFoods(text, slot);
    if (!items.length) return "Hmm, I couldn't tell what you had. Try again, like two eggs and toast.";
    const logged = logFoods(items, slot, today);
    if (!logged.length) return "Sorry, I couldn't save that to your diary. Try again?";
    navigateTo("/diary");
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
      return startCooking(id);
    case "show_groceries":
      showGroceries(id, action.args?.section);
      return null;
    case "go_to_step":
      return goToStep(action.args?.step);
    case "open_screen": {
      const screen = action.args?.screen;
      if (screen && screen in SCREEN_HREF) navigateTo(SCREEN_HREF[screen]);
      return null;
    }
    case "search_recipes":
      searchRecipes(action.args?.query);
      return null;
    case "show_video":
      return showVideo(action.args?.hide);
    case "open_map":
      openMap(action.args?.store);
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
