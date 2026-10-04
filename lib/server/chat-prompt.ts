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
import type { AppScreen, ChatContext, ChatRequest, ChatTurn, MealType, SousAction, SousActionName } from "@/lib/types";
import { DEFAULT_PERSONA, personaNamed } from "@/lib/voice/personas";

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
  "go_to_step",
  "open_screen",
  "search_recipes",
  "show_video",
  "open_map",
];

const MEALS: readonly MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const SCREENS: readonly AppScreen[] = ["home", "planner", "diary", "calendar", "nutrients", "profile", "social"];
/** search_recipes queries: a dish or ingredient, not a sentence */
const QUERY_MAX = 60;
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
      "Open one recipe to cook it. Call when the user picks a recipe by position (the first one), by a word from its title (the teriyaki one, chicken), by name, or by saying \"let's do this / that one / it\" about the recipe in focus. recipeId must be copied exactly from APP STATE: the recipes on screen, the other recipes list, or the recipe in focus. Never invent an id.",
    parametersJsonSchema: params(
      { recipeId: { type: "integer", description: "Exact id of the chosen recipe from the APP STATE recipes list" } },
      ["recipeId"],
    ),
  },
  {
    name: "show_groceries",
    description:
      "Open the grocery screen for a recipe: the shopping checklist of what they're missing plus the nearby stores with distances and price estimates. Call when they ask what they're missing, what to buy, whether they need to shop, or where to buy or get groceries (which store, closest, cheapest, open now). For store questions pass section \"stores\" and answer with the store names, distances and prices from APP STATE in say. Call it even if they're already on the grocery screen when they ask where to shop: it scrolls to the stores.",
    parametersJsonSchema: params({
      recipeId: { type: "integer", description: "Id of the recipe on the grocery screen, the active recipe, or the recipe they mention, from APP STATE" },
      section: { type: "string", enum: ["stores"], description: "\"stores\" when they ask where to shop; leave out for the checklist" },
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
  {
    name: "go_to_step",
    description:
      'Jump to a specific step of the recipe being cooked and open cooking mode on it: "go to step five", "skip to step three", "show me the last step", "back to the first step", "what\'s step four?". The app reads that step out loud itself.',
    parametersJsonSchema: {
      type: "object",
      properties: {
        step: { type: "integer", description: "Step number, starting at 1 (the last step is the step count in APP STATE)" },
      },
      required: ["step"],
    },
  },
  {
    name: "open_screen",
    description:
      "Open one of the app's main screens: home, planner (meal planner and recipe search), diary (today's food diary with meals, calories and macros), calendar (the month of logged days and the streak), nutrients (this week's vitamins and minerals vs targets), profile (weekly stats and macros), social (the community feed). Call when they ask to see or go to one, or when their question is answered on one (\"how much protein have I had today?\" opens the diary).",
    parametersJsonSchema: params(
      { screen: { type: "string", enum: [...SCREENS], description: "Which screen to open" } },
      ["screen"],
    ),
  },
  {
    name: "show_video",
    description:
      'Play the recipe\'s demonstration video inside the app (cooking mode), or close it with hide true. Call for "show the video", "show me a demonstration", "can I watch how to do this?", "play the tutorial"; and with hide for "close the video", "stop the video", "hide it".',
    parametersJsonSchema: params({ hide: { type: "boolean", description: "true to close the video instead of playing it" } }),
  },
  {
    name: "open_map",
    description:
      'Show a nearby grocery store on the map inside the app, with directions. Call for "open the map", "show me the map", "where is it?", "how do I get there?", "show Walmart on the map". Without a store it shows the cheapest one.',
    parametersJsonSchema: params({
      store: { type: "string", description: 'Store name from APP STATE when they name or clearly mean one ("Walmart", "Superstore", the closest one = the first store); leave out otherwise' },
    }),
  },
  {
    name: "search_recipes",
    description:
      'Search all recipes for a dish or ingredient and show the results in the meal planner: "find me a salmon recipe", "any beef ideas?", "show me something with chicken", "I want pasta tonight". Use show_recipes instead when they want ideas from their fridge scan.',
    parametersJsonSchema: params(
      { query: { type: "string", description: 'One to three words: the dish or main ingredient, e.g. "salmon", "beef", "pasta"' } },
      ["query"],
    ),
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

/**
 * The persona name the assistant speaks as ("Leo"). It goes into the system prompt, so only
 * a short plain name passes; anything else falls back to the default persona (Leo).
 */
export function cleanAssistantName(v: unknown): string {
  const name = str(v, 24);
  return /^[A-Za-z][A-Za-z' -]{0,23}$/.test(name) ? name : DEFAULT_PERSONA.name;
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
        video: a.video === true,
        servings: typeof a.servings === "number" && a.servings > 0 && a.servings < 50 ? Math.round(a.servings) : undefined,
        ingredients: strList(a.ingredients, 25, 100),
        nutrition: str(a.nutrition, 160) || undefined,
      };
    }
  }

  const userName = str(c.userName, 40);
  return {
    screen: str(c.screen, 200) || "/ai",
    // The client sends "there" when no name is set ("Hey there"); that's not a name.
    userName: /^there$/i.test(userName) ? "" : userName,
    assistantName: cleanAssistantName(c.assistantName),
    ingredients: strList(c.ingredients, 40, 60),
    recipes,
    activeRecipe,
    timer: str(c.timer, 120) || undefined,
    localTime: str(c.localTime, 80),
    ...cleanExtras(c),
  };
}

const num = (v: unknown, max: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(Math.round(v * 10) / 10, max)) : 0;

/** Known recipes, grocery list, stores and today's diary (all optional) */
function cleanExtras(c: Obj): Pick<ChatContext, "known" | "focus" | "groceries" | "stores" | "today"> {
  const out: Pick<ChatContext, "known" | "focus" | "groceries" | "stores" | "today"> = {};
  if (isObj(c.focus)) {
    const id = toRecipeId(c.focus.id);
    const title = str(c.focus.title, 120);
    if (id != null && title) out.focus = { id, title };
  }
  if (Array.isArray(c.known)) {
    const known: NonNullable<ChatContext["known"]> = [];
    for (const r of c.known.slice(0, 30)) {
      if (!isObj(r)) continue;
      const id = toRecipeId(r.id);
      const title = str(r.title, 120);
      if (id == null || !title) continue;
      known.push({ id, title, readyInMinutes: typeof r.readyInMinutes === "number" && r.readyInMinutes > 0 ? Math.round(r.readyInMinutes) : 0 });
    }
    if (known.length) out.known = known;
  }
  if (isObj(c.groceries)) {
    const id = toRecipeId(c.groceries.recipeId);
    const title = str(c.groceries.title, 120);
    if (id != null && title) out.groceries = { recipeId: id, title, need: strList(c.groceries.need, 15, 60) };
  }
  if (Array.isArray(c.stores)) {
    const stores: NonNullable<ChatContext["stores"]> = [];
    for (const s of c.stores.slice(0, 4)) {
      if (!isObj(s)) continue;
      const name = str(s.name, 60);
      if (!name) continue;
      stores.push({ name, km: num(s.km, 100), hours: str(s.hours, 40), estimate: str(s.estimate, 30) || undefined, cheapest: s.cheapest === true });
    }
    if (stores.length) out.stores = stores;
  }
  if (isObj(c.today) && isObj(c.today.goals)) {
    const t = c.today;
    const g = c.today.goals as Obj;
    out.today = {
      calories: num(t.calories, 20_000),
      protein: num(t.protein, 2000),
      carbs: num(t.carbs, 2000),
      fat: num(t.fat, 2000),
      fiber: num(t.fiber, 500),
      goals: { calories: num(g.calories, 20_000), protein: num(g.protein, 2000), carbs: num(g.carbs, 2000), fat: num(g.fat, 2000), fiber: num(g.fiber, 500) },
      meals: strList(t.meals, 12, 80),
    };
  }
  return out;
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
  if (path.startsWith("/planner") || path.startsWith("/ai/plan")) return "meal planner";
  if (path.startsWith("/ai/talk")) return "conversation";
  if (path.startsWith("/diary/calendar")) return "diary calendar";
  if (path.startsWith("/diary")) return "food diary (meals and nutrients)";
  if (path.startsWith("/me/nutrients")) return "weekly nutrients";
  if (path.startsWith("/me")) return "personal stats";
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
  if (ctx.known?.length) {
    const list = ctx.known.map((r) => `"${r.title}" (id ${r.id}${r.readyInMinutes ? `, ${r.readyInMinutes} min` : ""})`).join("; ");
    lines.push(`- Other recipes you can suggest and start by name: ${list}.`);
  }
  if (ctx.focus) lines.push(`- Recipe in focus (the one "this", "that one" or "it" means): "${ctx.focus.title}" (id ${ctx.focus.id}).`);
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
    const video = a.video ? " It has a demonstration video you can play with show_video." : " It has no video.";
    lines.push(`- Cooking: "${a.title}" (id ${a.id}), ${where}.${background}${video}`);
    if (a.ingredients?.length) {
      lines.push(`  Ingredients${a.servings ? ` (serves ${a.servings})` : ""}: ${a.ingredients.join("; ")}.`);
    }
    lines.push(
      a.nutrition
        ? `  Nutrition per serving: ${a.nutrition}.`
        : "  Nutrition: not listed. If asked, estimate it per serving from the ingredient amounts above and say it's a rough estimate.",
    );
  } else {
    lines.push("- Cooking: nothing yet.");
  }
  if (ctx.timer) lines.push(`- Timer: ${ctx.timer}.`);
  if (ctx.groceries) {
    lines.push(
      ctx.groceries.need.length
        ? `- Shopping list for "${ctx.groceries.title}" (id ${ctx.groceries.recipeId}), still to buy: ${ctx.groceries.need.join(", ")}.`
        : `- Shopping list for "${ctx.groceries.title}" (id ${ctx.groceries.recipeId}): nothing left to buy.`,
    );
  }
  if (ctx.stores?.length) {
    const list = ctx.stores
      .map((s) => `${s.name} (${s.km} km away, ${s.hours}${s.estimate ? `, this list ${s.estimate}` : ""}${s.cheapest ? ", cheapest" : ""})`)
      .join("; ");
    lines.push(`- Nearby grocery stores, nearest first: ${list}. The grocery screen shows them with directions.`);
  }
  const t = ctx.today;
  if (t) {
    const g = t.goals;
    lines.push(
      `- Today's diary: ${t.calories} of ${g.calories} kcal, protein ${t.protein} of ${g.protein} g, carbs ${t.carbs} of ${g.carbs} g, fat ${t.fat} of ${g.fat} g, fiber ${t.fiber} of ${g.fiber} g. ${t.meals.length ? `Logged: ${t.meals.join("; ")}.` : "Nothing logged yet today."}`,
    );
  }
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
  const assistant = ctx.assistantName || DEFAULT_PERSONA.name;
  // Each persona talks like its mascot: Maya warm, Leo calm, Nova upbeat, Brock the coach.
  const persona = personaNamed(assistant);
  const role = persona?.role ?? "sous-chef";
  const style = persona?.style ? ` ${persona.style}` : "";
  return `You are ${assistant}, the Sous ${role}: the voice of the Sous cooking app and a casual, encouraging friend who happens to be a great home cook.${style} ${name} usually just got home after a long day, tired and hungry, so make cooking feel easy and low pressure. Be kind and a little playful. Never preachy, never lecture about nutrition. Your name is ${assistant}; if ${name} asks who you are, you're ${assistant}, their ${role} in Sous.

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
- start_cooking: they pick a recipe by position ("the first one" means item one in the recipes on screen), by a word from the title ("let's do teriyaki" = Beef Teriyaki), by name, or with "let's do this", "that one", "make it", "yes" right after you or the screen offered one (the recipe in focus). Pass that recipe's exact id from any APP STATE list. Never search again for a recipe that's already in a list, and only ask which one when two fit equally well.
- show_groceries: they ask what they're missing, what to buy, whether they need to shop, or where to get groceries. Use the id of the recipe on the grocery screen, the active recipe, or the recipe they mean. For "where" questions (which store, closest, cheapest, open late) pass section "stores" and say the answer: the nearest store with its distance and hours, and which one is cheapest with its price, from APP STATE.
- log_meal: they just finished cooking a dish with Sous and want to snap a photo of it to log it ("that was amazing, log it").
- log_food: they tell you what they ate or drank ("log my lunch, chicken wrap and a latte", "I had two eggs and toast for breakfast", "just had a banana"). Put the foods in description as they said them, with amounts, and pass meal when they name it. The app estimates the nutrition and logs it. Don't use log_meal for this, and don't ask for a photo.
- next_step, previous_step, repeat_step: while cooking, "next", "done", "continue", "what's next" call next_step; "back", "go back", "previous" call previous_step; "repeat", "say that again", "what was that" call repeat_step. The app reads the step out loud itself, so your text for these is just "Okay."
- go_to_step: they name a step by number or position ("go to step five", "skip to step three", "what's the last step?", "start over from step one"). Pass the step number, starting at one. The app opens that step and reads it.
- open_screen: they want to see their diary, planner, calendar or streak, nutrients, profile or the social feed, or they ask something that screen answers (today's calories or protein: diary; vitamins this week: nutrients; their streak: calendar). Answer the question in say too.
- show_video: they want to see the video, a demonstration or the tutorial while a recipe is open. The app plays it right in cooking mode; say one short line. hide true when they want it closed.
- open_map: they want to see a store on the map or how to get there ("open the map", "how do I get to Walmart?"). The app opens the map; tell them the distance and hours of that store.
- search_recipes: they ask for a kind of dish or an ingredient ("find me a salmon recipe", "any beef ideas?", "something with chicken"), whether or not they've scanned their fridge. Pass one to three words.
- Don't reopen the screen they're already on just to talk; but do call the tool when it moves them somewhere useful on it (show_groceries with section "stores" scrolls to the stores).

TAKE INITIATIVE
Keep the cooking flow moving: suggest, then cook, then log. When ${name}'s intent is clear, act on it in the same turn instead of asking or searching again. When you suggest recipes, only name ones from APP STATE so they can pick one, and once they pick, call start_cooking right away.
You're a hands-on sous-chef, not a search box. When ${name} asks something the app can show, open it in the same turn AND answer the question out loud: don't make them ask twice, and don't only describe where to tap. Answer with the real specifics from APP STATE (store names, distances, prices, step text, today's numbers). Never say you can't see something that's in APP STATE. If the answer isn't there, say what you do know and do the most helpful action anyway.

COOKING HELP
While cooking, for questions about the current step (doneness, timing, heat, technique, substitutions, what a term means), ${talkOnly} a direct, practical answer from the step text and solid cooking knowledge. No app tool. Example: for chicken, it's done when the juices run clear, there's no pink in the middle, and it reads one hundred sixty-five degrees Fahrenheit inside.

${chatLine}

EXAMPLES
- "I'm exhausted and starving, no clue what to make." -> open_fridge_camera(say: "Oof, long day. Let's see what you've got, snap a quick photo of your fridge.")
- "What can I make with all this?" (ingredients known) -> show_recipes(say: "You've got plenty to work with. Here are a few ideas.")
- "Let's do teriyaki." or "Oh, let's do this." (Beef Teriyaki in a list or in focus) -> start_cooking(recipeId: <its id>, say: "Beef teriyaki, great choice.")
- "The salmon one sounds good." or "Let's do the second one." (recipes on screen) -> start_cooking(recipeId: <that recipe's id from APP STATE>, say: <a short excited line naming the dish>). Never just reply in text when they pick a recipe.
- "Next." (cooking) -> next_step()
- "That was amazing, log it." -> log_meal(say: "Love that. Snap a photo of your plate and I'll log it.")
- "Log my lunch, I had a chicken wrap and a latte." -> log_food(description: "chicken wrap and a latte", meal: "lunch", say: "Nice, logging that now.")
- "Can I use olive oil instead of butter?" (cooking) -> ${oliveOil}
- "Go to step five." (cooking) -> go_to_step(step: 5)
- "Where can I get groceries?" -> show_groceries(recipeId: <grocery or active recipe id>, section: "stores", say: "Walmart's closest, about one point two kilometres away and open till eleven. Superstore's a bit further but cheaper, around seventeen bucks for your list. I pulled them up for you.") Use the real stores and prices from APP STATE.
- "How much protein have I had today?" -> open_screen(screen: "diary", say: <today's protein and goal from APP STATE, and one easy tip if they're low>)
- "Find me a salmon recipe." -> search_recipes(query: "salmon", say: "Ooh, good call. Here are a few salmon ideas.")
- "Show me the demonstration video." (cooking) -> show_video(say: "Here's the video. Tap it to pause.")
- "Open the map." -> open_map(say: <that store, its distance and hours from APP STATE>)

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
  go_to_step: "Okay.",
  open_screen: "Here you go.",
  search_recipes: "Here's what I found.",
  show_video: "Here's the video. Tap it to pause.",
  open_map: "Here's the map. Tap Directions when you're ready to go.",
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

/** "Let's do this", "that one", "make it", "sounds good": a pick that names no recipe */
const THIS_ONE = /(this|that|it|that one|this one|sounds (good|great)|yes|yeah|sure|lets go)/i;

/** A 1-based step number from the model (an integer or a numeric string) */
function toStepNumber(v: unknown): number | null {
  const n = typeof v === "string" && /^\d{1,3}$/.test(v.trim()) ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 200 ? n : null;
}

/** "Salmon!" -> "salmon": a short dish or ingredient for the planner search */
export function cleanQuery(v: unknown): string {
  if (typeof v !== "string") return "";
  return v
    .toLowerCase()
    .replace(/[^a-z0-9&' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, QUERY_MAX)
    .trim();
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
  const known = new Set<number>([...ctx.recipes, ...(ctx.known ?? [])].map((r) => r.id));
  if (ctx.activeRecipe) known.add(ctx.activeRecipe.id);
  if (ctx.focus) known.add(ctx.focus.id);
  const pickable = [...ctx.recipes, ...(ctx.known ?? []).map((r) => ({ ...r, missing: [] as string[] }))];
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
      // A named recipe from any list; "let's do this one" means the recipe in focus.
      const id = argId != null && known.has(argId) ? argId : (pickRecipe(message, pickable) ?? (ctx.focus && THIS_ONE.test(message) ? ctx.focus.id : null));
      if (id == null) dropped.push(name);
      else screen = { name, args: { recipeId: id } };
    } else if (name === "show_groceries") {
      if (ctx.groceries) known.add(ctx.groceries.recipeId);
      const id =
        argId != null && known.has(argId)
          ? argId
          : (ctx.groceries?.recipeId ?? ctx.activeRecipe?.id ?? pickRecipe(message, ctx.recipes) ?? ctx.recipes[0]?.id ?? null);
      if (id == null) dropped.push(name);
      else screen = { name, args: call.args?.section === "stores" ? { recipeId: id, section: "stores" } : { recipeId: id } };
    } else if (name === "go_to_step") {
      const total = ctx.activeRecipe?.steps.length ?? 0;
      const step = toStepNumber(call.args?.step);
      if (!total || step == null || step > total) dropped.push(name);
      else screen = { name, args: { step } };
    } else if (name === "open_screen") {
      const target = call.args?.screen;
      if (typeof target === "string" && (SCREENS as readonly string[]).includes(target)) screen = { name, args: { screen: target as AppScreen } };
      else dropped.push(name);
    } else if (name === "search_recipes") {
      const query = cleanQuery(call.args?.query);
      if (!query) dropped.push(name);
      else screen = { name, args: { query } };
    } else if (name === "show_video") {
      const hide = call.args?.hide === true;
      if (!hide && !ctx.activeRecipe?.video) dropped.push(name);
      else screen = hide ? { name, args: { hide: true } } : { name };
    } else if (name === "open_map") {
      const store = typeof call.args?.store === "string" ? call.args.store.replace(/[^\w '&-]/g, "").trim().slice(0, 40) : "";
      screen = store ? { name, args: { store } } : { name };
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
  // The client reads the step it jumps to; this line is the same text for history and fallbacks.
  const jump = actions.find((a) => a.name === "go_to_step");
  if (jump && ctx.activeRecipe) {
    const steps = ctx.activeRecipe.steps;
    const i = Math.max(0, Math.min((jump.args?.step ?? 1) - 1, steps.length - 1));
    const label = i === steps.length - 1 && i > 0 ? `Last step, step ${i + 1}.` : `Step ${i + 1}.`;
    return speakable(`${label} ${steps[i]}`);
  }

  if (actions.length === 0 && dropped.length > 0) {
    const first = dropped[0];
    if (first === "start_cooking") return "Which one sounds good? You can say the first one, or tell me the name.";
    if (first === "show_video") {
      return ctx.activeRecipe ? "Sorry, this recipe doesn't have a video." : "Pick a recipe first and I'll pull up its video.";
    }
    if (first === "go_to_step") {
      const total = ctx.activeRecipe?.steps.length ?? 0;
      return total ? speakable(`This one has ${total} steps. Which step do you want?`) : "Pick a recipe first and I'll walk you through it.";
    }
    if (first === "show_groceries") {
      // No recipe to open, but a "where can I shop?" answer from the stores is still worth saying.
      const said = sanitizeReply(parsed.said || rawText);
      if (said && /\b(stores?|walmart|superstore|shop)\b/i.test(said)) return said;
      return "Pick a recipe first, then I can tell you exactly what you're missing.";
    }
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
