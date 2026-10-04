"use client";

import { useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/voice/context";

/**
 * The header Back button: back to the screen you came from, one step at a time. With no earlier
 * screen in the app (a fresh load or a shared link) it goes to `fallback`, which defaults to
 * Home, so Back always ends up at Home instead of leaving the app or bouncing between screens.
 */
export function useGoBack(): (fallback?: string) => void {
  const router = useRouter();
  return (fallback = "/ai") => {
    if (canGoBackInApp()) router.back();
    else router.push(fallback);
  };
}
