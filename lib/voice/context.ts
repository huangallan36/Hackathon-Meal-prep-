"use client";

/**
 * What Sous knows about the app right now: the current route (kept fresh by the
 * floating orb), the router, and a ChatContext snapshot built from the stores.
 */
import { useKitchen, type KitchenTimer } from "@/lib/stores/kitchen";
import { usePrefs } from "@/lib/stores/prefs";
import type { ChatContext } from "@/lib/types";

let currentPath = "";
let previousPath = "";
let routerPush: ((href: string) => void) | null = null;

export function setCurrentPath(path: string): void {
  if (path === currentPath) return;
  previousPath = currentPath;
  currentPath = path;
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
    };
  }
  if (k.timer) context.timer = formatTimer(k.timer, now);
  return context;
}
