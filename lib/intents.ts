/**
 * Keyword intent router + speech helpers. Pure TS (type imports only), used in two places:
 *  - server: /api/chat falls back to it when Gemini fails, and uses stepReply/speakable
 *  - client: instant "next / back / repeat" in cooking mode, and offline fallback
 */
import type { ChatContext, ChatResponse, SousAction, SousActionName } from "@/lib/types";

export type StepActionName = Extract<SousActionName, "next_step" | "previous_step" | "repeat_step">;

/* ------------------------------------------------------------------ */
/* Text normalization                                                  */
/* ------------------------------------------------------------------ */

/** Lowercase, drop apostrophes ("what's" -> "whats"), punctuation -> spaces, collapse. */
export function normalizeUtterance(message: string): string {
  return message
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Quick cooking commands                                              */
/* ------------------------------------------------------------------ */

const NEXT_PHRASES = new Set([
  "next", "next step", "next one", "next please", "whats next", "what is next", "whats the next step",
  "what do i do next", "what now", "now what", "then what", "and then", "continue", "go on", "keep going",
  "move on", "go ahead", "done", "im done", "done with that", "got it", "ready", "im ready", "lets go",
  "forward", "skip", "skip it", "next thing",
]);
const PREVIOUS_PHRASES = new Set([
  "back", "go back", "previous", "previous step", "last step", "step back", "go back a step",
  "go back one", "go back one step", "back one step", "one step back", "back a step", "the step before",
  "before that", "undo",
]);
const REPEAT_PHRASES = new Set([
  "repeat", "again", "say that again", "say it again", "say again", "what was that", "come again",
  "repeat that", "repeat it", "repeat the step", "repeat step", "repeat please", "one more time",
  "read it again", "read that again", "can you repeat that", "could you repeat that", "what did you say",
  "i missed that", "didnt catch that", "i didnt catch that", "pardon", "sorry", "huh", "what",
]);

/** Leading/trailing filler that doesn't change the command ("okay next", "next please, Sous"). */
const FILLER = new Set([
  "ok", "okay", "alright", "right", "sure", "yes", "yeah", "yep", "cool", "great", "nice", "perfect",
  "awesome", "please", "sous", "hey", "um", "uh", "so", "now", "thanks", "thank", "you", "and", "got", "it",
]);

function stripFiller(words: string[]): string[] {
  let start = 0;
  let end = words.length;
  while (start < end && FILLER.has(words[start])) start++;
  while (end > start && FILLER.has(words[end - 1])) end--;
  return words.slice(start, end);
}

/** Instant cooking-mode commands. Returns null unless the message is clearly one of them. */
export function quickCookingIntent(message: string): StepActionName | null {
  const text = normalizeUtterance(message);
  if (!text) return null;
  const words = text.split(" ");
  if (words.length > 6) return null;

  const candidates = [text, stripFiller(words).join(" ")].filter(Boolean);
  for (const c of candidates) {
    if (NEXT_PHRASES.has(c)) return "next_step";
    if (PREVIOUS_PHRASES.has(c)) return "previous_step";
    if (REPEAT_PHRASES.has(c)) return "repeat_step";
  }
  // "okay got it" is all filler words, but after a step it clearly means "next". A bare
  // "okay" / "perfect" is not: it is often just an ack to an answer, so Gemini decides.
  if (/^((ok|okay|alright|great|perfect|cool) )?got it$/.test(text)) return "next_step";
  return null;
}

/**
 * Looser step detection for the offline router while cooking: longer phrasings that name
 * a step ("show me the next step", "can you repeat the last step") or short ones that lead
 * with the command ("next, please"). Never used to override Gemini.
 */
function stepCommandIn(text: string): StepActionName | null {
  const words = text.split(" ");
  if (!/\bstep\b/.test(text) && words.length > 4) return null;
  if (/\b(repeat|again|reread|read (it|that|the step) again)\b/.test(text)) return "repeat_step";
  if (/\b(go back|back up|previous|step back|one step back|step before)\b/.test(text)) return "previous_step";
  if (/\b(next|continue|move on|keep going)\b/.test(text)) return "next_step";
  return null;
}

/* ------------------------------------------------------------------ */
/* Speech-friendly text                                                */
/* ------------------------------------------------------------------ */

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** 0..999999 -> words ("three hundred fifty"). Anything else stays as digits. */
export function numberToWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberToWords(n % 100)}` : ""}`;
  return `${numberToWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberToWords(n % 1000)}` : ""}`;
}

const ORDINALS: Record<number, string> = {
  1: "first", 2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "eighth",
  9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth", 20: "twentieth", 30: "thirtieth",
};

function ordinalWords(n: number): string {
  if (ORDINALS[n]) return ORDINALS[n];
  if (n > 20 && n < 100 && n % 10 && ORDINALS[n % 10]) return `${TENS[Math.floor(n / 10)]}-${ORDINALS[n % 10]}`;
  return `${numberToWords(n)}th`;
}

/** Fraction words, singular-friendly ("a quarter", "two thirds") */
function fractionWords(num: number, den: number): string | null {
  const key = `${num}/${den}`;
  const known: Record<string, string> = {
    "1/2": "half", "1/3": "a third", "2/3": "two thirds", "1/4": "a quarter", "3/4": "three quarters",
    "1/8": "an eighth", "3/8": "three eighths", "5/8": "five eighths", "7/8": "seven eighths",
  };
  return known[key] ?? null;
}

const UNITS: [RegExp, string, string][] = [
  [/^(tbsps?|tbs|tbl|tablespoons?)$/i, "tablespoon", "tablespoons"],
  [/^(tsps?|teaspoons?)$/i, "teaspoon", "teaspoons"],
  [/^(oz|ounces?)$/i, "ounce", "ounces"],
  [/^(lbs?|pounds?)$/i, "pound", "pounds"],
  [/^(g|gr|grams?)$/i, "gram", "grams"],
  [/^(kg|kilograms?)$/i, "kilogram", "kilograms"],
  [/^(ml|milliliters?|millilitres?)$/i, "milliliter", "milliliters"],
  [/^(mins?|minutes?)$/i, "minute", "minutes"],
  [/^(hrs?|hours?)$/i, "hour", "hours"],
  [/^(secs?|seconds?)$/i, "second", "seconds"],
  [/^(cm)$/i, "centimeter", "centimeters"],
  [/^(cups?)$/i, "cup", "cups"],
];
const DETERMINER = /^(the|your|it|of|a|an|each|every|this|that|those|these|my)$/i;
const UNIT_WORD = /^(tablespoon|teaspoon|ounce|pound|gram|kilogram|milliliter|minute|hour|second|centimeter|cup|can|clove|pinch|handful|stick|slice|piece|inch)$/;

function unitFor(token: string, plural: boolean): string | null {
  for (const [re, one, many] of UNITS) if (re.test(token)) return plural ? many : one;
  return null;
}

/**
 * Make text sound right through TTS: digits, fractions, temperatures, units and
 * symbols become words ("350°F" -> "three hundred fifty degrees Fahrenheit",
 * "1/2 cup" -> "half a cup", "2 tbsp" -> "two tablespoons"). Idempotent on prose.
 */
export function speakable(input: string): string {
  let s = input
    .replace(/½/g, " 1/2")
    .replace(/¼/g, " 1/4")
    .replace(/¾/g, " 3/4")
    .replace(/⅓/g, " 1/3")
    .replace(/⅔/g, " 2/3")
    .replace(/⅛/g, " 1/8")
    .replace(/(\d)\s+(?=\s\d\/\d)/g, "$1")
    .replace(/[–—]/g, "-");

  // Temperatures
  s = s
    .replace(/(\d+)\s*(?:°|degrees?|deg\.?)\s*F\b/gi, "$1 degrees Fahrenheit")
    .replace(/(\d+)\s*(?:°|degrees?|deg\.?)\s*C\b/gi, "$1 degrees Celsius")
    .replace(/(\d{2,3})F\b/g, "$1 degrees Fahrenheit")
    .replace(/(\d{2,3})C\b/g, "$1 degrees Celsius")
    .replace(/(\d+)\s*°/g, "$1 degrees");

  // Ranges "3-4 minutes" -> "3 to 4 minutes"
  s = s.replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)(?=\s|$|[a-z])/gi, "$1 to $2");

  // Quantity + unit abbreviation: "2 tbsp" -> "2 tablespoons", "1/2 tsp" -> "1/2 teaspoon"
  s = s.replace(
    /(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*([a-z]+)(\.?)(?=[\s,;:!?)]|$)/gi,
    (match, qty: string, unit: string, dot: string) => {
      const word = unitFor(unit, isPluralQuantity(qty));
      return word ? `${qty} ${word}${dot}` : match;
    },
  );

  // Mixed fractions "1 1/2 cups" -> "one and a half cups"
  s = s.replace(/\b(\d+)\s+(\d+)\/(\d+)\b/g, (match, whole: string, num: string, den: string) => {
    const frac = fractionWords(Number(num), Number(den));
    if (!frac) return match;
    return `${numberToWords(Number(whole))} and ${frac === "half" ? "a half" : frac}`;
  });

  // Simple fractions "1/2 cup" -> "half a cup", "1/4 teaspoon" -> "a quarter of a teaspoon"
  s = s.replace(/\b(\d+)\/(\d+)(\s+([a-z]+))?/gi, (match, num: string, den: string, rest: string | undefined, word: string | undefined) => {
    const frac = fractionWords(Number(num), Number(den));
    if (!frac) return `${num} over ${den}${rest ?? ""}`;
    if (!word) return frac === "half" ? "a half" : frac;
    if (DETERMINER.test(word)) return frac === "half" ? `half ${word}` : `${frac} of ${word}`;
    const article = /^[aeiou]/i.test(word) ? "an" : "a";
    if (frac === "half") return `half ${article} ${word}`;
    return UNIT_WORD.test(word.toLowerCase()) ? `${frac} of ${article} ${word}` : `${frac} ${word}`;
  });

  // Clock times / timers "7:05" -> "seven oh five", "7:00" -> "seven"
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h: string, m: string) => {
    const mm = Number(m);
    const hour = numberToWords(Number(h));
    if (mm === 0) return hour;
    return mm < 10 ? `${hour} oh ${numberToWords(mm)}` : `${hour} ${numberToWords(mm)}`;
  });

  // Decimals, percents, ordinals, integers
  s = s
    .replace(/\b(\d+)\.5\b/g, (_m, w: string) => (w === "0" ? "half" : `${numberToWords(Number(w))} and a half`))
    .replace(/\b(\d+)\.(\d+)\b/g, (_m, w: string, d: string) => `${numberToWords(Number(w))} point ${d.split("").map((c) => ONES[Number(c)]).join(" ")}`)
    .replace(/(\d+)\s*%/g, "$1 percent")
    .replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_m, n: string) => ordinalWords(Number(n)))
    .replace(/\d+/g, (n) => (n.length <= 6 ? numberToWords(Number(n)) : n));

  return s
    .replace(/\s*&\s*/g, " and ")
    .replace(/\bw\/\s*/gi, "with ")
    .replace(/\bapprox\.?\s/gi, "about ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isPluralQuantity(qty: string): boolean {
  const q = qty.trim();
  if (/^\d+\s+\d+\/\d+$/.test(q)) return true;
  if (/^\d+\/\d+$/.test(q)) {
    const [n, d] = q.split("/").map(Number);
    return d > 0 && n / d > 1;
  }
  return Number(q) !== 1 && !(Number(q) < 1);
}

/* ------------------------------------------------------------------ */
/* Cooking steps                                                       */
/* ------------------------------------------------------------------ */

/**
 * What Sous says after a step command, computed from the context *before* the store
 * moves (stepIndex is the current step). The client should speak this and not
 * read the step a second time.
 */
export function stepReply(action: StepActionName, context: Pick<ChatContext, "activeRecipe">): string {
  const recipe = context.activeRecipe;
  if (!recipe || recipe.steps.length === 0) {
    return "We're not cooking anything yet. Pick a recipe and I'll walk you through it.";
  }
  const last = recipe.steps.length - 1;
  const current = Math.max(-1, Math.min(recipe.stepIndex, last));
  let target: number;

  if (action === "next_step") {
    if (current >= last) {
      return "That was the last step, nice work. Snap a photo of your finished meal and I'll log it for you.";
    }
    target = current + 1;
  } else if (action === "previous_step") {
    if (current <= 0) {
      return current === 0
        ? "Okay, back to the overview. Say next when you're ready for step one."
        : "We're right at the start. Say next when you're ready for step one.";
    }
    target = current - 1;
  } else {
    if (current < 0) {
      return speakable(`This is ${recipe.title}, ${recipe.steps.length} steps in all. Say next when you're ready for step one.`);
    }
    target = current;
  }

  const label = target === last && last > 0 ? `Last step, step ${target + 1}.` : `Step ${target + 1}.`;
  return speakable(`${label} ${recipe.steps[target]}`);
}

/* ------------------------------------------------------------------ */
/* Recipe picking                                                      */
/* ------------------------------------------------------------------ */

const TITLE_STOPWORDS = new Set([
  "a", "an", "the", "and", "with", "of", "in", "on", "for", "to", "style", "easy", "quick", "simple",
  "best", "recipe", "one", "minute", "minutes", "homemade", "classic", "my", "your", "this", "that",
]);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("es") && !word.endsWith("ses")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function keywords(text: string): Set<string> {
  return new Set(
    normalizeUtterance(text)
      .split(" ")
      .filter((w) => w.length > 2 && !TITLE_STOPWORDS.has(w))
      .map(stem),
  );
}

const ORDINAL_PICKS: [RegExp, number][] = [
  [/\b(first|1st|number one|top one|option one)\b/, 0],
  [/\b(second|2nd|number two|option two)\b/, 1],
  [/\b(third|3rd|number three|option three)\b/, 2],
  [/\b(fourth|4th|number four|option four)\b/, 3],
  [/\b(fifth|5th|number five|option five)\b/, 4],
];

/**
 * Recipe id the user is pointing at ("the first one", "the garlic chicken one"), or null.
 * A unique title match wins over an ordinal, so "first, is the salmon one quick?" means salmon.
 */
export function pickRecipe(message: string, recipes: ChatContext["recipes"]): number | null {
  if (recipes.length === 0) return null;
  const text = normalizeUtterance(message);
  const byTitle = pickByTitle(message, recipes);
  if (byTitle != null) return byTitle;

  if (/\bstep\b/.test(text)) return null;
  if (/\b(last one|the last recipe|bottom one)\b/.test(text)) return recipes[recipes.length - 1].id;
  for (const [re, index] of ORDINAL_PICKS) {
    if (re.test(text) && recipes[index]) return recipes[index].id;
  }
  return null;
}

function pickByTitle(message: string, recipes: ChatContext["recipes"]): number | null {
  const said = keywords(message);
  let best: number | null = null;
  let bestScore = 0;
  let tie = false;
  for (const r of recipes) {
    let score = 0;
    for (const w of keywords(r.title)) if (said.has(w)) score++;
    if (score > bestScore) {
      best = r.id;
      bestScore = score;
      tie = false;
    } else if (score > 0 && score === bestScore) {
      tie = true;
    }
  }
  return bestScore > 0 && !tie ? best : null;
}

/* ------------------------------------------------------------------ */
/* Fallback router                                                     */
/* ------------------------------------------------------------------ */

// No lookbehind anywhere in this file: it is a parse-time SyntaxError on Safari < 16.4,
// and this module ships in the client bundle.
const RE = {
  thanksOnly: /^(ok |okay |great |awesome |perfect )?(thanks|thank you|thank you so much|thanks so much|cheers|thx|ty)( sous)?( so much)?$/,
  bye: /\b(bye|goodbye|good night|see you|see ya|talk later|later sous)\b/,
  thanks: /\b(thanks|thank you|cheers|appreciate it)\b/,
  greeting: /^(hi|hey|hello|yo|hiya|good (morning|afternoon|evening))( there)?( sous)?$/,
  help: /\b(help|what can you do|how does this work|what do you do)\b/,
  log: /\b(log (it|this|that|my|the|meal|dinner|lunch|breakfast)|log$|track (it|this|that)|add (it|this|that) to (my )?diary|i ate|ive eaten|i just ate|done eating|finished eating|all done|im full|that was (so )?(delicious|good|great|amazing|tasty)|(snap|photo|picture of) (my|the) (meal|plate|dish|food))\b/,
  // "do I need to flip it?" is a cooking question, not a shopping trip.
  groceries: /\b(grocer(y|ies)|shopping|shop|buy|missing|need to get|pick up|supermarket|the store)\b|^what do i need( for (this|it|that|the recipe|this recipe))?$|\bdo i (need|have) (anything|everything)\b/,
  showRecipes: /\b(recipes?|ideas?|suggest(ions?)?|options|what can i (make|cook)|what could i (make|cook)|something else|what else|show me (some |the |other )?(recipes|ideas|options|something))\b/,
  strongList: /\b(ideas?|suggest(ions?)?|options|what (else )?can i (make|cook)|what could i (make|cook)|something else|what else|other recipes|more recipes)\b/,
  switchCue: /\b(switch to|instead|lets (do|make|cook|try)|go with|change to|ill (do|make|have))\b/,
  pickCue: /\b(lets|let us|ill|i will|i want|id like|i would like|go with|do|make|cook|try|pick|choose|start|sounds (good|great)|that one|this one|one)\b/,
  // Not bare "ingredients": mid-cook, "which ingredients go in now?" is about the recipe.
  fridge: /\b(fridge|scan|camera|look in|whats in my|my ingredients|what i (have|got)|what ive got)\b/,
  /** Clearly "help me figure out food", even with an old recipe still open */
  undecided: /\b(no idea|dont know what|not sure what|what (should|do|can) i (cook|make|eat)|what to (cook|make|eat)|something (else )?to eat|feed me|cook tonight|whats for dinner)\b/,
  /** Mood and meal words: a fridge cue only when nothing is mid-cook ("I'm starving, how long left?") */
  tired: /\b(tired|wiped|exhausted|im beat|drained|long day|rough day|hungry|starving|dinner|lunch|breakfast)\b/,
  weary: /\b(tired|wiped|exhausted|im beat|drained|long day|rough day)\b/,
  question: /\b(how|what|when|why|which|is it|should i|can i|do i|does it|how long|ready|done yet|substitute|instead)\b/,
};

/** "no idea what to cook" must not read as "ideas" (a request for the recipe list). */
const withoutNoIdea = (text: string) => text.replace(/\bno ideas?\b/g, " ");

function reply(text: string, actions: SousAction[] = []): ChatResponse {
  return { reply: speakable(text), actions, source: "fallback" };
}

/** Always returns a usable reply (with actions when the intent is clear). source = "fallback". */
export function fallbackReply(message: string, context: ChatContext): ChatResponse {
  const text = normalizeUtterance(message ?? "");
  const recipes = context.recipes ?? [];
  const active = context.activeRecipe;
  const cooking = Boolean(active && active.steps.length > 0);

  if (!text) return reply("Sorry, I didn't catch that. Try saying scan my fridge.");

  if (cooking) {
    const step = quickCookingIntent(text) ?? stepCommandIn(text);
    if (step) return { reply: stepReply(step, context), actions: [{ name: step }], source: "fallback" };
  }

  if (RE.thanksOnly.test(text)) return reply("Anytime. Enjoy every bite, you earned it.");
  if (RE.bye.test(text)) return reply("Talk soon. Enjoy your food!");

  if (RE.log.test(text)) {
    return reply("Love that. Snap a quick photo of your plate and I'll log it to your diary.", [{ name: "log_meal" }]);
  }

  const listText = withoutNoIdea(text);
  if (RE.groceries.test(text) && !RE.strongList.test(listText)) {
    const id = active?.id ?? pickRecipe(text, recipes) ?? recipes[0]?.id;
    if (id == null) return reply("Pick a recipe first, then I can tell you exactly what you're missing.");
    return reply("Here's what you're missing. I put it all on a little shopping list.", [
      { name: "show_groceries", args: { recipeId: id } },
    ]);
  }

  // Mid-cook (on the cooking or conversation screen), most messages are about the current
  // step, so switching recipes needs a clear cue. A recipe left open in the store while the
  // user browses other screens doesn't count.
  const onCookingScreen = /^\/ai\/(cook|talk)(\/|$)/.test(context.screen ?? "");
  const midCook = active && cooking && active.stepIndex >= 0 && onCookingScreen ? active : null;
  const wantsList = RE.showRecipes.test(listText);
  if (recipes.length > 0 && !wantsList && !(cooking && /\bstep\b/.test(text))) {
    const cued = midCook
      ? RE.switchCue.test(text)
      : RE.pickCue.test(text) || /\b(first|second|third|fourth|fifth|last one)\b/.test(text);
    const id = cued ? pickRecipe(text, recipes) : null;
    if (id != null) {
      const title = recipes.find((r) => r.id === id)?.title ?? "that one";
      return reply(`Great pick. Let's make ${title}. Say next when you're ready for step one.`, [
        { name: "start_cooking", args: { recipeId: id } },
      ]);
    }
  }

  if (wantsList) {
    if ((context.ingredients ?? []).length > 0 || recipes.length > 0) {
      return reply("Here are a few ideas from what you've got. Tell me which one sounds good.", [{ name: "show_recipes" }]);
    }
    return reply("Let's see what you've got first. Snap a quick photo of your fridge.", [{ name: "open_fridge_camera" }]);
  }

  // Don't yank a mid-cook question over to the fridge; re-read the step instead.
  if (midCook && RE.question.test(text) && !RE.fridge.test(text) && !RE.undecided.test(text)) {
    const step = midCook.steps[Math.min(midCook.stepIndex, midCook.steps.length - 1)];
    return reply(`I'm having trouble connecting right now, so here's the step again. ${step}`);
  }

  if (RE.fridge.test(text) || RE.undecided.test(text) || (!midCook && RE.tired.test(text))) {
    const opener = RE.weary.test(text) ? "Long day, huh. " : "";
    return reply(`${opener}Let's see what you've got. Snap a quick photo of your fridge and I'll find something easy.`, [
      { name: "open_fridge_camera" },
    ]);
  }

  if (RE.greeting.test(text)) return reply("Hey! Tell me how your day's going, or say scan my fridge and we'll figure out dinner.");
  if (RE.help.test(text)) {
    return reply("I can look in your fridge, suggest recipes, and walk you through cooking step by step. Try saying scan my fridge.");
  }
  if (RE.thanks.test(text)) return reply("Anytime. Enjoy every bite, you earned it.");

  return reply(
    cooking
      ? "I'm having a little trouble connecting, but I can still help. Say next, go back, or repeat."
      : "I'm having a little trouble connecting, but I can still help. Try saying scan my fridge, or next step.",
  );
}
