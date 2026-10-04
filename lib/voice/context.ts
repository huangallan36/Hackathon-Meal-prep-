"use client";

/**
 * What Sous knows about the app right now: the current route (kept fresh by the
 * floating orb), the router, and a ChatContext snapshot built from the stores.
 */
import { dayTotals, MEAL_LABEL } from "@/lib/diary/stats";
import { CHEAPEST_STORE, formatDollars, groceryKey, groceryPlan, NEARBY_STORES, storeEstimate } from "@/lib/kitchen/groceries";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { useDiary } from "@/lib/stores/diary";
import { useKitchen, type KitchenTimer } from "@/lib/stores/kitchen";
import { usePrefs } from "@/lib/stores/prefs";
import { useVideo } from "@/lib/stores/video";
import type { ChatContext, Recipe } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { currentPersona } from "./persona";

let currentPath = "";
let previousPath = "";
let routerPush: ((href: string) => void) | null = null;

export function setCurrentPath(path: string): void {
  if (path === currentPath) return;
  previousPath = currentPath;
  currentPath = path;
  // Leaving cooking mode closes its video (hands-free listening waits while one is open).
  if (!path.startsWith("/ai/cook/") && useVideo.getState().recipeId != null) useVideo.getState().hide();
}

export function getCurrentPath(): string {
  if (currentPath) return currentPath;
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

/** The route before this one ("" on a fresh load), so "minimize" knows whether back() stays in the app. */
export function getPreviousPath(): string {
  return previousPath;
}

export function setRouterPush(push: (href: string) => void): void {
  routerPush = push;
}

/** Client-side navigation; a no-op when already there. */
export function navigateTo(href: string): void {
  if (getCurrentPath() === href) return;
  if (routerPush) {
    routerPush(href);
    // Optimistic: actions later in the same turn see the new screen.
    setCurrentPath(href);
  } else {
    console.warn("[voice] no router registered; cannot open", href);
  }
}

function formatTimer(t: KitchenTimer, now: number): string {
  const label = t.label?.trim() || "your";
  const left = Math.max(0, Math.round((t.endsAt - now) / 1000));
  if (t.doneAt || left === 0) return `${label} timer is done`;
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, "0");
  return `${m}:${s} left on ${label}${/timer$/i.test(label) ? "" : " timer"}`;
}

const MAX_STEPS = 30;
const MAX_STEP_CHARS = 400;
const MAX_RECIPES = 8;

export function buildChatContext(): ChatContext {
  const { userName } = usePrefs.getState();
  const k = useKitchen.getState();
  const now = Date.now();

  const context: ChatContext = {
    screen: getCurrentPath(),
    userName: userName || "there",
    assistantName: currentPersona().name,
    ingredients: k.ingredients.slice(0, 40),
    recipes: k.matches.slice(0, MAX_RECIPES).map((m) => ({
      id: m.recipe.id,
      title: m.recipe.title,
      readyInMinutes: m.recipe.readyInMinutes,
      missing: m.missing.slice(0, 10).map((i) => i.name),
    })),
    localTime: new Date(now).toLocaleString("en-US", {
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
    }),
  };

  if (k.activeRecipe) {
    context.activeRecipe = {
      id: k.activeRecipe.id,
      title: k.activeRecipe.title,
      steps: k.activeRecipe.steps.slice(0, MAX_STEPS).map((s) => s.text.slice(0, MAX_STEP_CHARS)),
      stepIndex: k.stepIndex,
      video: Boolean(k.activeRecipe.youtubeId),
    };
  }
  if (k.timer) context.timer = formatTimer(k.timer, now);
  try {
    addShopping(context, k);
    addToday(context);
  } catch (err) {
    // Extra grounding only; a turn never fails over it.
    console.warn("[voice] context extras failed:", err instanceof Error ? err.message : err);
  }
  return context;
}

/**
 * The shopping list Sous can talk about: the recipe on the grocery screen, else the one being
 * cooked. Stores are always included so "where can I get groceries?" has an answer.
 */
function addShopping(context: ChatContext, k: ReturnType<typeof useKitchen.getState>): void {
  const onGroceries = /^\/ai\/groceries\/(\d+)/.exec(context.screen);
  const id = onGroceries ? Number(onGroceries[1]) : k.activeRecipe?.id;
  let recipe: Recipe | undefined;
  if (id != null) {
    recipe =
      (k.activeRecipe?.id === id ? k.activeRecipe : undefined) ??
      k.matches.find((m) => m.recipe.id === id)?.recipe ??
      getCachedRecipe(id);
  }
  const need = recipe
    ? groceryPlan(recipe, k.ingredients).need.filter((i) => !k.groceryChecked[groceryKey(recipe.id, i.name)])
    : [];
  if (recipe) context.groceries = { recipeId: recipe.id, title: recipe.title, need: need.slice(0, 15).map((i) => i.name) };
  context.stores = NEARBY_STORES.map((s, i) => ({
    name: s.name,
    km: s.km,
    hours: s.hours,
    estimate: need.length ? `about ${formatDollars(storeEstimate(s, need))}` : undefined,
    cheapest: i === CHEAPEST_STORE,
  }));
}

/** Today's diary vs goals, so "how's my protein?" gets real numbers */
function addToday(context: ChatContext): void {
  const { entries, goals } = useDiary.getState();
  const today = todayISO();
  const { totals } = dayTotals(entries, today);
  const meals = entries
    .filter((e) => e.date === today)
    .map((e) => `${MEAL_LABEL[e.meal]}: ${e.name}`)
    .slice(0, 12);
  const r = Math.round;
  context.today = {
    calories: r(totals.calories),
    protein: r(totals.protein),
    carbs: r(totals.carbs),
    fat: r(totals.fat),
    fiber: r(totals.fiber),
    goals: { calories: r(goals.calories), protein: r(goals.protein), carbs: r(goals.carbs), fat: r(goals.fat), fiber: r(goals.fiber) },
    meals,
  };
}
