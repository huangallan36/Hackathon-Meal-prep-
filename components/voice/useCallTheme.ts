"use client";

/**
 * Design rules v1, call screen: it follows the phone. White in light mode (Figma 5.1–5.4),
 * #0B0B0B in dark mode (Figma 5.6), from `prefers-color-scheme`. Everything else in the app
 * stays light.
 *
 * The shell can use usePrefersDark() for the status bar / home indicator over the call
 * (white on black only when the call is dark).
 */
import { useSyncExternalStore } from "react";

export type CallTheme = "light" | "dark";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/** True when the phone is in dark mode (reactive) */
export function usePrefersDark(): boolean {
  return useSyncExternalStore(subscribe, prefersDark, () => false);
}

/** The call screen's theme: the phone's */
export function useCallTheme(): CallTheme {
  return usePrefersDark() ? "dark" : "light";
}
