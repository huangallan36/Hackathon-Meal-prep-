/**
 * Server-only: everything /api/chat needs around the Gemini call. Request
 * validation, the Sous system prompt, tool declarations, history -> contents,
 * and turning the model's text + function calls into a safe ChatResponse.
 */
import {
  FunctionCallingConfigMode,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type GenerateContentConfig,
} from "@google/genai";
import { fallbackReply, pickRecipe, quickCookingIntent, speakable, stepReply, type StepActionName } from "@/lib/intents";
import type { ChatContext, ChatRequest, ChatTurn, MealType, SousAction, SousActionName } from "@/lib/types";

export const CHAT_LIMITS = {
  message: 500,
  historyTurns: 16,
  historyText: 600,
  bodyBytes: 64_000,
  replyChars: 320,
  replySentences: 3,
} as const;

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

export const SOUS_ACTIONS: readonly SousActionName[] = [
  "open_fridge_camera",
  "show_recipes",
  "start_cooking",
  "show_groceries",
  "log_meal",
  "log_food",
  "next_step",
  "previous_step",
  "repeat_step",
];

const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];
/** log_food's description is what the client sends to /api/nutrition/estimate */
export const FOOD_DESCRIPTION_MAX = 200;

const STEP_ACTIONS: readonly StepActionName[] = ["next_step", "previous_step", "repeat_step"];

/** Flash-Lite tends to return either text or a call, so the spoken line rides along as an argument. */
const SAY = {
  type: "string",
  description:
    "One or two short, warm, casual sentences to say out loud while doing this, with contractions (let's, I'll, you're). Numbers as words; no digits, emoji or symbols like ° or %.",
};

function params(extra: Record<string, unknown> = {}, required?: string[]) {
  return { type: "object", properties: { say: SAY, ...extra }, ...(required ? { required } : {}) };
}

export const SOUS_TOOLS: FunctionDeclaration[] = [
  {
    name: "open_fridge_camera",
    description:
      "Open the fridge camera so the user can snap a photo and Sous can spot their ingredients. Call when the user is tired, hungry, doesn't know what to cook, asks what's for dinner, or asks you to look in or scan their fridge. Don't call it if they are already on the fridge screen.",
    parametersJsonSchema: params(),
  },
  {
    name: "show_recipes",
    description:
      "Show recipe ideas built from the user's ingredients. Call when ingredients are known and the user wants ideas, asks what they can make, or wants to see the options again.",
    parametersJsonSchema: params(),
  },
  {
    name: "start_cooking",
    description:
      "Open step-by-step cooking mode for one recipe. Call when the user picks a recipe by position (the first one), by a word from its title (the chicken one), or by name. recipeId must be copied exactly from the APP STATE recipes list. Never invent an id; if the choice is ambiguous, ask instead of calling.",
    parametersJsonSchema: params(
      { recipeId: { type: "integer", description: "Exact id of the chosen recipe from the APP STATE recipes list" } },
      ["recipeId"],
    ),
  },
  {
    name: "show_groceries",
    description:
      "Show what the user is missing for a recipe as a shopping checklist. Call when they ask what they're missing, what to buy, or whether they need to go shopping.",
    parametersJsonSchema: params({
      recipeId: { type: "integer", description: "Id of the active recipe, or of the recipe they mention, from APP STATE" },
    }),
  },
  {
    name: "log_meal",
    description:
      "Open the meal photo screen so they can photograph a dish they just cooked with Sous and log it (Sous estimates the nutrition from the photo). Call when they finish cooking or eating that dish and want to log or track it. Not for foods they describe in words: that's log_food.",
    parametersJsonSchema: params(),
  },
  {
    name: "log_food",
    description:
      'Log foods or drinks the user tells you they ate or drank, e.g. "log my lunch, chicken wrap and a latte" or "I had two eggs and toast for breakfast". Sous estimates calories, macros, vitamins and minerals from the description, adds them to today\'s food diary and opens it. Call it whenever they say what they ate or drank, even without the word log. Never use log_meal for this.',
    parametersJsonSchema: params(
      {
        description: {
          type: "string",
          description:
            'The foods and drinks exactly as the user described them, with any amounts or sizes, e.g. "chicken wrap and a large oat latte" or "two eggs and two slices of toast". Food words only, no meal name or filler.',
        },
        meal: {
          type: "string",
          enum: ["breakfast", "lunch", "dinner", "snack"],
          description: "Only when the user names the meal or it's obvious (a snack); otherwise leave it out and the app uses the time of day.",
        },
      },
      ["description"],
    ),
  },
  {
    name: "next_step",
    description: "Cooking mode: go to the next step. Call when the user says next, done, continue, what's next, or that they finished the current step.",
  },
  {
    name: "previous_step",
    description: "Cooking mode: go back one step. Call when the user says back, go back, or previous step.",
  },
  {
    name: "repeat_step",
    description: "Cooking mode: read the current step again. Call when the user asks you to repeat it, missed it, or asks what the step was.",
  },
];

/** Internal "just talk" function. Not a SousAction; it lets us force a function call every turn. */
export const REPLY_TOOL: FunctionDeclaration = {
  name: "reply",
  description:
    "Just talk, with no app action: answer a question (including cooking questions about the current step), chat, ask a clarifying question, or respond to thanks or goodbye.",
  parametersJsonSchema: { type: "object", properties: { say: SAY }, required: ["say"] },
};

/* ------------------------------------------------------------------ */
/* Request validation                                                  */
/* ------------------------------------------------------------------ */

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function toRecipeId(v: unknown): number | null {
  const n = typeof v === "string" && /^\d{1,10}$/.test(v.trim()) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n > 0 && n < 1e10 ? n : null;
}

function cleanContext(raw: unknown): ChatContext {
  const c = isObj(raw) ? raw : {};
  const recipes: ChatContext["recipes"] = [];
  if (Array.isArray(c.recipes)) {
    for (const r of c.recipes.slice(0, 12)) {
      if (!isObj(r)) continue;
      const id = toRecipeId(r.id);
      const title = str(r.title, 120);
      if (id == null || !title) continue;
      const minutes = typeof r.readyInMinutes === "number" && r.readyInMinutes > 0 ? Math.round(r.readyInMinutes) : 0;
      recipes.push({ id, title, readyInMinutes: minutes, missing: strList(r.missing, 15, 60) });
    }
  }

  let activeRecipe: ChatContext["activeRecipe"];
  if (isObj(c.activeRecipe)) {
    const a = c.activeRecipe;
    const id = toRecipeId(a.id);
    const steps = strList(a.steps, 40, 700);
    if (id != null) {
      const idx = typeof a.stepIndex === "number" && Number.isInteger(a.stepIndex) ? a.stepIndex : -1;
      activeRecipe = {
        id,
        title: str(a.title, 120) || "this recipe",
        steps,
        stepIndex: Math.max(-1, Math.min(idx, steps.length - 1)),
      };
    }
  }

  const userName = str(c.userName, 40);
  return {
    screen: str(c.screen, 200) || "/ai",
    // The client sends "there" when no name is set ("Hey there"); that's not a name.
    userName: /^there$/i.test(userName) ? "" : userName,
    ingredients: strList(c.ingredients, 40, 60),
    recipes,
    activeRecipe,
    timer: str(c.timer, 120) || undefined,
    localTime: str(c.localTime, 80),
  };
}

/** Untrusted JSON -> a bounded ChatRequest. Returns null when there's no usable message. */
export function parseChatRequest(body: unknown): ChatRequest | null {
  if (!isObj(body)) return null;
  const message = str(body.message, CHAT_LIMITS.message);
  const history: ChatTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const t of body.history.slice(-CHAT_LIMITS.historyTurns * 2)) {
      if (!isObj(t) || (t.role !== "user" && t.role !== "sous")) continue;
      const text = str(t.text, CHAT_LIMITS.historyText);
      if (text) history.push({ role: t.role, text });
    }
  }
  return { message, history: history.slice(-CHAT_LIMITS.historyTurns), context: cleanContext(body.context) };
}

/* ------------------------------------------------------------------ */
/* Prompt                                                              */
/* ------------------------------------------------------------------ */

function screenLabel(path: string): string {
  if (/^\/ai\/cook\//.test(path)) return "cooking mode";
  if (/^\/ai\/groceries\//.test(path)) return "grocery list";
  if (path.startsWith("/ai/fridge")) return "fridge camera";
  if (path.startsWith("/ai/recipes")) return "recipe suggestions";
  if (path.startsWith("/ai/snap")) return "meal photo (logging what they ate)";
  if (path.startsWith("/ai/plan")) return "meal planner";
  if (path.startsWith("/ai/talk")) return "conversation";
  if (path.startsWith("/diary")) return "food diary";
  if (path.startsWith("/social")) return "social feed";
  return "home";
}

/** Plain-English summary of the context; small models ground much better on this than on JSON alone. */
function describeState(ctx: ChatContext): string {
  const lines = [`- Screen: ${screenLabel(ctx.screen)} (${ctx.screen}).`];
  if (ctx.localTime) lines.push(`- Local time: ${ctx.localTime}.`);
  lines.push(
    ctx.ingredients.length
      ? `- Ingredients they have: ${ctx.ingredients.join(", ")}.`
      : "- Ingredients: none known yet (they haven't scanned their fridge).",
  );
  if (ctx.recipes.length) {
    const list = ctx.recipes
      .map((r, i) => {
        const missing = r.missing.length ? `missing ${r.missing.join(", ")}` : "has everything";
        return `  ${i + 1}. "${r.title}" (id ${r.id}, ${r.readyInMinutes || "?"} min, ${missing})`;
      })
      .join("\n");
    lines.push(`- Recipes on screen, in order:\n${list}`);
  } else {
    lines.push("- Recipes on screen: none yet.");
  }
  const a = ctx.activeRecipe;
  if (a) {
    const where =
      a.stepIndex < 0
        ? `on the overview, not started (${a.steps.length} steps)`
        : `on step ${a.stepIndex + 1} of ${a.steps.length}: "${a.steps[a.stepIndex] ?? ""}"`;
    // A recipe stays in the store after cooking; off the cook screen it may be old news.
    const background = ctx.screen.startsWith("/ai/cook/")
      ? ""
      : " It's open in the background; they're not on the cooking screen right now.";
    lines.push(`- Cooking: "${a.title}" (id ${a.id}), ${where}.${background}`);
  } else {
    lines.push("- Cooking: nothing yet.");
  }
  if (ctx.timer) lines.push(`- Timer: ${ctx.timer}.`);
  return lines.join("\n");
}

/**
 * Every turn is a function call (an app tool or "reply"). In testing, Flash-Lite in AUTO
 * mode often talked about an action ("let's peek in your fridge") without calling it;
 * with mode ANY it went 8/8 on the demo scenarios.
 */
export const FORCE_CALL = true;

export interface PromptOptions {
  /** Force a function call every turn (mode ANY + the reply tool). */
  forceCall?: boolean;
}

export function buildSystemInstruction(ctx: ChatContext, opts: PromptOptions = {}): string {
  const name = ctx.userName || "the user";
  const state = JSON.stringify(ctx);
  const force = opts.forceCall ?? FORCE_CALL;
  const toolsIntro = force
    ? `Every turn, respond by calling exactly one function: an app tool when ${name} needs an action, otherwise reply. Put your spoken line in the "say" argument. The app only changes screens or steps when you call an app tool, so never use reply to promise an action (looking in the fridge, showing recipes, starting a recipe, logging a meal or what they ate); call that tool instead.`
    : `The app only changes screens or steps when you call a tool, so if you'd say you'll do something (look in the fridge, show recipes, start cooking, log a meal or what they ate), call that tool in the same turn instead of only talking about it. Put the line you'd say in the tool's "say" argument. Call at most one tool per turn.`;
  const talkOnly = force ? "call reply with" : "give";
  const chatLine = force
    ? "Anything else: call reply to chat briefly and kindly, steering gently toward cooking. Thanks or goodbye: reply with something warm."
    : "Anything else: chat briefly and kindly and steer gently toward cooking. Thanks or goodbye get a warm reply and no tool call.";
  const oliveOil = force
    ? `reply(say: "Totally, olive oil works. It won't brown quite the same, so keep the heat at medium.")`
    : `no tool, just answer: "Totally, olive oil works. It won't brown quite the same, so keep the heat at medium."`;
  return `You are Sous, the voice of a cooking app: a warm, casual, encouraging friend who happens to be a great home cook. ${name} usually just got home after a long day, tired and hungry, so make cooking feel easy and low pressure. Be kind and a little playful. Never preachy, never lecture about nutrition.

HOW YOU TALK
Everything you write is spoken aloud by a text-to-speech voice, so write exactly what should be heard.
- One to three short sentences, usually one or two. Get to the point.
- Sound like a real friend talking: use contractions (let's, it's, you're, I'll) and casual phrasing.
- Plain conversational English. No markdown, asterisks, lists, headings, emoji, or stage directions like (laughs).
- Spell numbers, units, temperatures and fractions as words: "three hundred fifty degrees Fahrenheit", "half a cup", "two tablespoons", "about ten minutes". Never write digits, symbols like ° / %, or abbreviations like tbsp, tsp, oz, min.
- Never say recipe ids, JSON, field names or screen paths out loud.
- ${name} always speaks first and you're already mid-conversation, so don't greet them or introduce yourself unless they greet you.

GROUNDING
APP STATE below is the live state of the app for this turn. Ground every answer in it: use the ingredients, recipe titles and cooking steps exactly as given. Never invent ingredients, recipes, ids or steps. If something isn't there, say so briefly and offer the next move.

TOOLS
${toolsIntro}
- open_fridge_camera: they're tired, hungry, don't know what to cook, ask what's for dinner, or ask you to check their fridge. Empathize in a few words, then call it right away. Don't ask permission first. Do this even if APP STATE already lists ingredients (they may be stale), unless they ask you to use those.
- show_recipes: ingredients are known and they want ideas, ask what they can make, or want to see the options again.
- start_cooking: they pick a recipe by position ("the first one" means item one in the recipes list), by a word from the title ("the chicken one"), or by name. Pass that recipe's exact id from APP STATE. Never guess or make up an id. If two recipes fit equally, ask which one instead of calling.
- show_groceries: they ask what they're missing, what to buy, or whether they need to shop. Use the active recipe's id, or the id of the recipe they mean.
- log_meal: they just finished cooking a dish with Sous and want to snap a photo of it to log it ("that was amazing, log it").
- log_food: they tell you what they ate or drank ("log my lunch, chicken wrap and a latte", "I had two eggs and toast for breakfast", "just had a banana"). Put the foods in description as they said them, with amounts, and pass meal when they name it. The app estimates the nutrition and logs it. Don't use log_meal for this, and don't ask for a photo.
- next_step, previous_step, repeat_step: while cooking, "next", "done", "continue", "what's next" call next_step; "back", "go back", "previous" call previous_step; "repeat", "say that again", "what was that" call repeat_step. The app reads the step out loud itself, so your text for these is just "Okay."
- Don't call a tool that opens the screen they're already on, unless they ask.

COOKING HELP
While cooking, for questions about the current step (doneness, timing, heat, technique, substitutions, what a term means), ${talkOnly} a direct, practical answer from the step text and solid cooking knowledge. No app tool. Example: for chicken, it's done when the juices run clear, there's no pink in the middle, and it reads one hundred sixty-five degrees Fahrenheit inside.

${chatLine}

EXAMPLES
- "I'm exhausted and starving, no clue what to make." -> open_fridge_camera(say: "Oof, long day. Let's see what you've got, snap a quick photo of your fridge.")
- "What can I make with all this?" (ingredients known) -> show_recipes(say: "You've got plenty to work with. Here are a few ideas.")
- "The salmon one sounds good." or "Let's do the second one." (recipes on screen) -> start_cooking(recipeId: <that recipe's id from APP STATE>, say: <a short excited line naming the dish>). Never just reply in text when they pick a recipe.
- "Next." (cooking) -> next_step()
- "That was amazing, log it." -> log_meal(say: "Love that. Snap a photo of your plate and I'll log it.")
- "Log my lunch, I had a chicken wrap and a latte." -> log_food(description: "chicken wrap and a latte", meal: "lunch", say: "Nice, logging that now.")
- "Can I use olive oil instead of butter?" (cooking) -> ${oliveOil}

APP STATE (live, this turn)
${describeState(ctx)}
Raw JSON (stepIndex is zero-based, -1 means not started):
${state}`;
}

type ChatConfig = Omit<GenerateContentConfig, "abortSignal" | "thinkingConfig">;

/** Full Gemini config for a chat turn (shared by the route and the scenario scripts). */
export function chatConfig(ctx: ChatContext, opts: PromptOptions = {}): ChatConfig {
  const force = opts.forceCall ?? FORCE_CALL;
  return {
    systemInstruction: buildSystemInstruction(ctx, { forceCall: force }),
    tools: [{ functionDeclarations: force ? [...SOUS_TOOLS, REPLY_TOOL] : SOUS_TOOLS }],
    toolConfig: force ? { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } } : undefined,
    temperature: 0.5,
    maxOutputTokens: 1024,
  };
}

/** History -> Gemini contents. Text only; tool use is never replayed as functionCall parts. */
export function buildContents(history: ChatTurn[], message: string): Content[] {
  const turns = history.filter((t) => t.text.trim());
  const last = turns[turns.length - 1];
  // Some clients include the current message as the last history turn.
  if (last && last.role === "user" && last.text.trim() === message.trim()) turns.pop();

  const contents: Content[] = [];
  for (const t of turns) {
    const role = t.role === "user" ? "user" : "model";
    // Gemini wants a user turn first.
    if (contents.length === 0 && role === "model") continue;
    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) prev.parts = [{ text: `${prev.parts?.[0]?.text ?? ""}\n${t.text}` }];
    else contents.push({ role, parts: [{ text: t.text }] });
  }
  const prev = contents[contents.length - 1];
  if (prev && prev.role === "user") prev.parts = [{ text: `${prev.parts?.[0]?.text ?? ""}\n${message}` }];
  else contents.push({ role: "user", parts: [{ text: message }] });
  return contents;
}

/* ------------------------------------------------------------------ */
/* Response handling                                                   */
/* ------------------------------------------------------------------ */

const CANNED: Record<SousActionName, string> = {
  open_fridge_camera: "Let's see what you've got. Snap a quick photo of your fridge.",
  show_recipes: "Here are a few ideas from what you've got. Tell me which one sounds good.",
  start_cooking: "Great pick. Say next when you're ready for step one.",
  show_groceries: "Here's what you're missing. I put it on a little shopping list.",
  log_meal: "Nice work. Snap a photo of your plate and I'll log it to your diary.",
  log_food: "Got it, logging that now.",
  next_step: "Okay.",
  previous_step: "Okay.",
  repeat_step: "Okay.",
};

const isStep = (name: SousActionName): name is StepActionName => (STEP_ACTIONS as readonly string[]).includes(name);

/** A food description safe to send on: one line, no control characters, at most 200 chars */
export function cleanFoodDescription(v: unknown): string {
  if (typeof v !== "string") return "";
  const text = Array.from(v, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= FOOD_DESCRIPTION_MAX) return text;
  const cut = text.slice(0, FOOD_DESCRIPTION_MAX);
  const space = cut.lastIndexOf(" ");
  return (space > FOOD_DESCRIPTION_MAX * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "");
}

function toMeal(v: unknown): MealType | undefined {
  return typeof v === "string" && (MEALS as readonly string[]).includes(v) ? (v as MealType) : undefined;
}

export interface ParsedActions {
  actions: SousAction[];
  /** Calls we refused (unknown recipe id, no active recipe...) */
  dropped: SousActionName[];
  /** First non-empty "say" argument from the calls */
  said: string;
  /** True when an action was added by rescueActions */
  rescued?: boolean;
}

/**
 * Validate Gemini's function calls against the allow-list and the ids actually in context.
 * Result: at most one screen action, or one step action. A step action next to a screen
 * action is dropped: the client runs actions in order, so "log_meal + next_step" would open
 * the snap screen and then jump straight back to cooking mode.
 */
export function toActions(calls: FunctionCall[] | undefined, ctx: ChatContext, message: string): ParsedActions {
  const known = new Set<number>(ctx.recipes.map((r) => r.id));
  if (ctx.activeRecipe) known.add(ctx.activeRecipe.id);
  let screen: SousAction | null = null;
  let step: SousAction | null = null;
  const dropped: SousActionName[] = [];
  let said = "";

  for (const call of calls ?? []) {
    if (!said && typeof call.args?.say === "string") said = call.args.say.slice(0, 400);
    const name = call.name as SousActionName;
    if (!SOUS_ACTIONS.includes(name)) continue;
    const argId = toRecipeId(call.args?.recipeId);

    if (isStep(name)) {
      if (step) continue;
      if (ctx.activeRecipe && ctx.activeRecipe.steps.length > 0) step = { name };
      else dropped.push(name);
      continue;
    }
    if (screen) continue;
    if (name === "start_cooking") {
      const id = argId != null && known.has(argId) ? argId : pickRecipe(message, ctx.recipes);
      if (id == null) dropped.push(name);
      else screen = { name, args: { recipeId: id } };
    } else if (name === "show_groceries") {
      const id =
        argId != null && known.has(argId)
          ? argId
          : (ctx.activeRecipe?.id ?? pickRecipe(message, ctx.recipes) ?? ctx.recipes[0]?.id ?? null);
      if (id == null) dropped.push(name);
      else screen = { name, args: { recipeId: id } };
    } else if (name === "log_food") {
      // The model sometimes drops the description; the user's own words are the next best thing.
      const description = cleanFoodDescription(call.args?.description) || cleanFoodDescription(message);
      const meal = toMeal(call.args?.meal);
      if (!description) dropped.push(name);
      else screen = { name, args: meal ? { description, meal } : { description } };
    } else {
      screen = { name };
    }
  }
  const actions = screen ? [screen] : step ? [step] : [];
  return { actions, dropped, said };
}

/**
 * What the model's text sounds like when it means an action but forgot to call it.
 * Deliberately narrow: a false positive navigates away mid-conversation.
 */
const PROMISES: Partial<Record<SousActionName, RegExp>> = {
  open_fridge_camera: /\b(fridge|photo|picture|snap|peek|take a look|have a look|look in)\b/,
  show_recipes: /\b(ideas|recipes|options|here are|here's what)\b/,
  start_cooking: /\b(let's (get )?(cooking|cook|make|start|do)|let's get started|great (pick|choice)|good (pick|choice)|coming up)\b/,
  log_meal: /\b(log|diary|snap|plate)\b/,
  log_food: /\b(log|logged|logging|diary|added|adding|track|tracked)\b/,
  show_groceries: /\b(missing|shopping list|grocery|groceries|to buy|the store)\b/,
};
const SAME_SCREEN: Partial<Record<SousActionName, RegExp>> = {
  open_fridge_camera: /^\/ai\/fridge/,
  show_recipes: /^\/ai\/recipes/,
  log_meal: /^\/ai\/snap/,
  show_groceries: /^\/ai\/groceries/,
};

/**
 * Safety net for a model that talks about an action without calling it ("let's peek in your
 * fridge" with no call). Adds the action only when the keyword router detects the same intent
 * in the user's message AND the model's own words promise it. Exact cooking commands
 * ("next", "go back") always map to their step action.
 */
export function rescueActions(parsed: ParsedActions, rawText: string, message: string, ctx: ChatContext): ParsedActions {
  if (parsed.actions.length > 0 || parsed.dropped.length > 0) return parsed;
  if (ctx.activeRecipe && ctx.activeRecipe.steps.length > 0) {
    const step = quickCookingIntent(message);
    if (step) return { ...parsed, actions: [{ name: step }], rescued: true };
  }
  const guess = fallbackReply(message, ctx).actions[0];
  if (!guess) return parsed;
  const promise = PROMISES[guess.name];
  if (!promise?.test(`${rawText} ${parsed.said}`.toLowerCase())) return parsed;
  if (SAME_SCREEN[guess.name]?.test(ctx.screen)) return parsed;
  if (guess.name === "start_cooking" && ctx.screen === `/ai/cook/${guess.args?.recipeId}`) return parsed;
  return { ...parsed, actions: [guess], rescued: true };
}

/** "*laughs*", "(smiles warmly)", "[pause]" and friends. Bold/italic text itself is kept. */
const STAGE_DIRECTION =
  /\[[^\]]{0,60}\]|[*_(]{1,2}\s*(?:laughs?|chuckles?|smiles?|sighs?|grins?|pauses?|winks?|nods?|claps?|giggles?|beams?|cheerfully|warmly|softly|excitedly)\b[^*_)]{0,40}[*_)]{1,2}/gi;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}]/gu;

/** Cap at N sentences / M chars, cutting on a sentence boundary when possible. */
function capReply(text: string, sentences: number, chars: number): string {
  const parts = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g)?.map((p) => p.trim()).filter(Boolean) ?? [text];
  let out = "";
  for (const p of parts.slice(0, sentences)) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > chars) break;
    out = next;
  }
  if (!out) {
    const cut = text.slice(0, chars);
    const space = cut.lastIndexOf(" ");
    out = `${(space > chars * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}.`;
  }
  return out;
}

/** Flash-Lite sometimes writes "Let us" / "I will"; contract when a word follows so it sounds natural. */
const CONTRACTIONS: [RegExp, string][] = [
  [/\b([Ll])et us\b/g, "$1et's"],
  [/\b([Ii]) will (?=[a-z])/g, "$1'll "],
  [/\b([Ii]) am (?=[a-z])/g, "$1'm "],
  [/\b([Yy]ou|[Ww]e|[Tt]hey) are (?=[a-z])/g, "$1're "],
  [/\b([Yy]ou|[Ww]e|[Tt]hey) will (?=[a-z])/g, "$1'll "],
  [/\b([Ii]t|[Tt]hat|[Tt]here|[Ww]hat) is (?=[a-z])/g, "$1's "],
  [/\b([Dd]o|[Dd]oes|[Ii]s|[Aa]re) not (?=[a-z])/g, "$1n't "],
];

/** Make model text safe to speak: no markdown, emoji or stage directions, digits spelled out, 3 sentences max. */
export function sanitizeReply(text: string): string {
  let cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(STAGE_DIRECTION, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*_`#>~|]/g, "")
    .replace(EMOJI, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  for (const [re, to] of CONTRACTIONS) cleaned = cleaned.replace(re, to);
  return capReply(speakable(cleaned), CHAT_LIMITS.replySentences, CHAT_LIMITS.replyChars);
}

/**
 * Final spoken line for a Gemini turn. Step commands get a deterministic read-out
 * of the target step (so the model can't misquote it). Returns "" when there is
 * nothing usable, so the caller falls back to the keyword router.
 */
export function finalizeReply(rawText: string, parsed: ParsedActions, ctx: ChatContext): string {
  const { actions, dropped } = parsed;
  const step = actions.find((a) => isStep(a.name));
  if (step && isStep(step.name)) return stepReply(step.name, ctx);

  if (actions.length === 0 && dropped.length > 0) {
    const first = dropped[0];
    if (first === "start_cooking") return "Which one sounds good? You can say the first one, or tell me the name.";
    if (first === "show_groceries") return "Pick a recipe first, then I can tell you exactly what you're missing.";
    if (first === "log_food") return "Tell me what you had, like a chicken wrap and a latte, and I'll log it.";
    if (isStep(first)) return stepReply(first, ctx);
  }

  const filler = /^(okay|ok|sure|alright)\.?$/i;
  for (const candidate of [rawText, parsed.said]) {
    const text = sanitizeReply(candidate);
    if (text && !filler.test(text)) return text;
  }
  return actions.length > 0 ? CANNED[actions[0].name] : sanitizeReply(rawText);
}
