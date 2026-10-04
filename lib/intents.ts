/**
 * Keyword intent router (contract). Pure TS, used in two places:
 *  - server: /api/chat falls back to it when Gemini fails
 *  - client: instant "next / back / repeat" in cooking mode, and offline fallback
 *
 * STUB: replaced by the real implementation.
 */
import type { ChatContext, ChatResponse, SousActionName } from "@/lib/types";

/** Instant cooking-mode commands. Returns null unless the message is clearly one of them. */
export function quickCookingIntent(message: string): Extract<SousActionName, "next_step" | "previous_step" | "repeat_step"> | null {
  void message;
  return null;
}

/** Always returns a usable reply (with actions when the intent is clear). source = "fallback". */
export function fallbackReply(message: string, context: ChatContext): ChatResponse {
  void message;
  void context;
  return { reply: "Sorry, I didn't catch that. Try saying: scan my fridge.", actions: [], source: "fallback" };
}
