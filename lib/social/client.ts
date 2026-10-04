"use client";

/** Client actions for the Social tab: moderation with an offline fallback, and "Cook this". */
import { TIMEOUTS } from "@/lib/config";
import { postJSON } from "@/lib/http";
import { toImageInput } from "@/lib/image";
import { loadRecipe } from "@/lib/recipes/client";
import { useKitchen } from "@/lib/stores/kitchen";
import { toast } from "@/lib/stores/toast";
import type { ModerationResponse } from "@/lib/types";
import { checkTextLocally } from "./moderation-local";
import type { ModerationPayload } from "./moderation-policy";

/**
 * Ask /api/moderate (Gemini) whether a post may go up. If the request itself fails
 * (offline, timeout, bad response) the shared local caption check decides instead.
 */
export async function moderatePost(input: { photo: string; caption: string; dishName: string }): Promise<ModerationResponse> {
  try {
    const body: ModerationPayload = { image: toImageInput(input.photo), caption: input.caption, dishName: input.dishName };
    const res = await postJSON<ModerationResponse>("/api/moderate", body, { timeoutMs: TIMEOUTS.moderation });
    if (typeof res?.allowed === "boolean" && typeof res.reason === "string") return res;
    throw new Error("unexpected moderation response");
  } catch {
    const local = checkTextLocally(input.dishName, input.caption);
    return { allowed: local.allowed, reason: local.reason, source: "fallback" };
  }
}

/** Load a post's recipe into cooking mode and open it. Returns false (after a toast) if unavailable. */
export async function cookFromPost(recipeId: number | undefined, push: (href: string) => void): Promise<boolean> {
  if (recipeId == null) {
    toast("This one's a home original, so there's no recipe to cook yet.", "warning");
    return false;
  }
  try {
    const recipe = await loadRecipe(recipeId);
    if (!recipe?.steps.length) {
      toast("Couldn't load that recipe right now. Try again in a bit?", "warning");
      return false;
    }
    useKitchen.getState().startCooking(recipe);
    push(`/ai/cook/${recipeId}`);
    return true;
  } catch {
    toast("Couldn't load that recipe right now. Try again in a bit?", "warning");
    return false;
  }
}
