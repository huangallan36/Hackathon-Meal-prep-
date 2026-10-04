/**
 * POST /api/chat: one Sous conversation turn (ChatRequest -> ChatResponse).
 * Gemini Flash-Lite answers with spoken text + function calls in a single round
 * trip. Any failure degrades to the keyword router, so this always returns 200.
 */
import { fallbackReply } from "@/lib/intents";
import {
  buildContents,
  CHAT_LIMITS,
  chatConfig,
  finalizeReply,
  parseChatRequest,
  rescueActions,
  toActions,
} from "@/lib/server/chat-prompt";
import { CHAT_MODELS, describeError, generate, hasGeminiKey, textOf } from "@/lib/server/gemini";
import type { ChatContext, ChatResponse } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

const EMPTY_CONTEXT: ChatContext = { screen: "/ai", userName: "", ingredients: [], recipes: [], localTime: "" };

function respond(body: ChatResponse): Response {
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  let message = "";
  let context = EMPTY_CONTEXT;

  try {
    const raw = await request.text();
    if (raw.length > CHAT_LIMITS.bodyBytes) {
      console.warn(`[chat] body too large (${raw.length} chars)`);
      return respond(fallbackReply("", context));
    }

    const parsed = parseChatRequest(JSON.parse(raw));
    if (!parsed) return respond(fallbackReply("", context));
    message = parsed.message;
    context = parsed.context;
    if (!message) return respond(fallbackReply("", context));
    if (!hasGeminiKey()) return respond(fallbackReply(message, context));

    const { response } = await generate({
      models: CHAT_MODELS,
      contents: buildContents(parsed.history, message),
      config: chatConfig(context),
      timeoutMs: 9000,
      attemptTimeoutMs: 6000,
      label: "chat",
    });

    const text = textOf(response);
    const actions = rescueActions(toActions(response.functionCalls, context, message), text, message, context);
    const reply = finalizeReply(text, actions, context);
    if (!reply) {
      console.warn("[chat] empty Gemini reply, using fallback");
      return respond(fallbackReply(message, context));
    }
    if (actions.dropped.length) console.warn(`[chat] dropped invalid calls: ${actions.dropped.join(", ")}`);
    if (actions.rescued) console.info(`[chat] rescued action: ${actions.actions[0]?.name}`);
    return respond({ reply, actions: actions.actions, source: "gemini" });
  } catch (err) {
    console.error(`[chat] falling back: ${describeError(err)}`);
    try {
      return respond(fallbackReply(message, context));
    } catch {
      return respond({ reply: "Sorry, I lost my train of thought. Try saying scan my fridge.", actions: [], source: "fallback" });
    }
  }
}
