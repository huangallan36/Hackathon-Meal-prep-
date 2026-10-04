/**
 * Shared domain types and API contracts. Client and server both import this file,
 * so it must stay free of runtime code and of server-only imports.
 */

/* ------------------------------------------------------------------ */
/* Recipes                                                             */
/* ------------------------------------------------------------------ */

export interface Ingredient {
  id?: number;
  /** Short lowercase name, e.g. "chicken breast" */
  name: string;
  /** Human line as written in the recipe, e.g. "2 chicken breasts, diced". Best for display/TTS. */
  original: string;
  amount?: number;
  unit?: string;
  /** Absolute image URL */
  image?: string;
  aisle?: string;
}

export interface RecipeStep {
  /** 1-based, renumbered across instruction sections */
  number: number;
  text: string;
  /** Duration from Spoonacular's step.length when present (minutes) */
  minutes?: number;
}

export interface Nutrition {
  calories: number;
  /** grams */
  protein: number;
  /** grams */
  carbs: number;
  /** grams */
  fat: number;
  /** grams */
  fiber: number;
}

/**
 * Nutrients tracked beyond the core five. Units and daily targets live in lib/nutrients.ts.
 * iron/calcium/vitaminA are always present on totals; the rest are optional per entry.
 */
export interface Micros {
  /** mg */
  iron: number;
  /** mg */
  calcium: number;
  /** micrograms RAE */
  vitaminA: number;
  /** mg */
  vitaminC?: number;
  /** micrograms */
  vitaminD?: number;
  /** mg */
  potassium?: number;
  /** mg (limit) */
  sodium?: number;
  /** g (limit) */
  sugar?: number;
  /** g (limit) */
  saturatedFat?: number;
  /** mg (limit) */
  cholesterol?: number;
}

export interface Recipe {
  id: number;
  title: string;
  /** Absolute URL (Spoonacular CDN) or a /public path */
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceName?: string;
  sourceUrl?: string;
  /** Credit for a bundled catalog photo (public/CREDITS.md); Spoonacular photos have none */
  imageCredit?: ImageCredit;
  /** Plain-text one or two sentence summary (HTML stripped) */
  summary?: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  /** Per serving, when known */
  nutrition?: Nutrition & Partial<Micros>;
  /** Hardcoded tutorial for cached demo recipes (data/youtube.json) */
  youtubeId?: string;
}

export interface ImageCredit {
  /** Ready to show: “Title” by Author, licence */
  text: string;
  /** The photo's source page (Wikimedia Commons) */
  url?: string;
}

export interface RecipeMatch {
  recipe: Recipe;
  /** Fridge ingredient names this recipe uses */
  used: string[];
  /** Recipe ingredients the user does not have */
  missing: Ingredient[];
}

/* ------------------------------------------------------------------ */
/* Diary                                                               */
/* ------------------------------------------------------------------ */

/** Local calendar date, "YYYY-MM-DD" */
export type ISODate = string;

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface DiaryEntry {
  id: string;
  date: ISODate;
  meal: MealType;
  name: string;
  /** e.g. "1 bowl", "2 slices" */
  portion: string;
  nutrition: Nutrition;
  micros?: Partial<Micros>;
  /** Small data URL or image URL */
  image?: string;
  recipeId?: number;
  source: "seed" | "ai" | "manual";
  /** True when numbers came from Gemini's photo estimate */
  estimated?: boolean;
  /** epoch ms */
  loggedAt: number;
}

export interface DailyActivity {
  steps: number;
  exerciseKcal: number;
  exerciseMinutes: number;
  sleepHours: number;
}

export interface NutritionGoals extends Nutrition, Micros {}

/* ------------------------------------------------------------------ */
/* Social                                                              */
/* ------------------------------------------------------------------ */

export interface SocialUser {
  handle: string;
  name: string;
  /** /public path, e.g. /avatars/maya.svg */
  avatar: string;
  bio: string;
  location?: string;
  followers: number;
  following: number;
  /** consecutive cooking days */
  streak: number;
  isMe?: boolean;
}

export interface SocialPost {
  id: string;
  author: string; // handle
  dishName: string;
  caption: string;
  /** Image URL or data URL */
  image: string;
  recipeId?: number;
  upvotes: number;
  /** epoch ms */
  createdAt: number;
}

/** Hand-off from the AI tab ("Share to Social") to the post composer */
export interface PostDraft {
  image: string;
  dishName: string;
  recipeId?: number;
}

/* ------------------------------------------------------------------ */
/* Voice + AI actions                                                  */
/* ------------------------------------------------------------------ */

export type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

export type SousActionName =
  | "open_fridge_camera"
  | "show_recipes"
  | "start_cooking"
  | "show_groceries"
  | "log_meal"
  | "next_step"
  | "previous_step"
  | "repeat_step"
  /** Log foods described by voice ("log my lunch: chicken wrap and a latte"); Gemini estimates the numbers */
  | "log_food"
  /** Jump straight to a cooking step ("go to step five") */
  | "go_to_step"
  /** Open one of the app's main screens (diary, planner, nutrients...) */
  | "open_screen"
  /** Search recipes by dish or ingredient in the planner */
  | "search_recipes"
  /** Play (or with hide, close) the recipe's video inside cooking mode */
  | "show_video"
  /** Show a nearby store on the in-app map */
  | "open_map";

/** Screens Sous can open with open_screen */
export type AppScreen = "home" | "planner" | "diary" | "calendar" | "nutrients" | "profile" | "social";

/** One food item Gemini estimated from a spoken description */
export interface SpokenFood {
  name: string;
  /** e.g. "1 wrap", "12 oz" */
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** Everything else Gemini estimated (vitamins, minerals, sugar, sodium...) */
  micros?: Partial<Micros>;
}

export interface SousAction {
  name: SousActionName;
  /**
   * log_food: `description` is what the user said they ate; the client estimates it via /api/nutrition/estimate.
   * go_to_step: `step` is 1-based. open_screen: `screen`. search_recipes: `query`.
   * show_groceries: `section: "stores"` scrolls to the nearby stores. show_video: `hide` closes it.
   * open_map: `store` names the store ("Walmart"); left out = the cheapest.
   */
  args?: {
    hide?: boolean;
    store?: string;
    recipeId?: number;
    meal?: MealType;
    description?: string;
    items?: SpokenFood[];
    step?: number;
    screen?: AppScreen;
    query?: string;
    section?: "stores";
  };
}

export interface ChatTurn {
  role: "user" | "sous";
  text: string;
}

/** Snapshot of app state sent with every chat turn so Gemini can ground its answer */
export interface ChatContext {
  /** Current pathname, e.g. "/ai/cook/123" */
  screen: string;
  userName: string;
  /** Selected voice persona's name ("Maya", "Leo", "Nova"); the assistant speaks as this persona */
  assistantName?: string;
  ingredients: string[];
  /** Recipes currently on screen / last suggested */
  recipes: { id: number; title: string; readyInMinutes: number; missing: string[] }[];
  /** Other recipes Sous can start by name: what the planner showed, then the bundled catalog */
  known?: { id: number; title: string; readyInMinutes: number }[];
  /** The recipe "this one" / "let's do it" means: the one Sous last mentioned or the user last opened */
  focus?: { id: number; title: string };
  activeRecipe?: {
    id: number;
    title: string;
    steps: string[];
    /** -1 = overview (not started), else 0-based index into steps */
    stepIndex: number;
    /** It has a demonstration video Sous can play (show_video) */
    video?: boolean;
    servings?: number;
    /** Ingredient lines with amounts ("2 cups jasmine rice") */
    ingredients?: string[];
    /** Per-serving nutrition when known, e.g. "540 kcal, 50 g protein, 45 g carbs, 18 g fat, 3 g fiber" */
    nutrition?: string;
  };
  /** e.g. "12:30 left on pasta timer" */
  timer?: string;
  /** Local time string so Sous can say "tonight" etc. */
  localTime: string;
  /** Shopping list for the recipe on the grocery screen (or the active one): what's still to buy */
  groceries?: { recipeId: number; title: string; need: string[] };
  /** Nearby stores (demo data), nearest first, with the estimated cost of `groceries.need` */
  stores?: { name: string; km: number; hours: string; estimate?: string; cheapest: boolean }[];
  /** Today's food diary so far vs the user's daily goals */
  today?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    goals: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
    meals: string[];
  };
}

export interface ChatRequest {
  message: string;
  /** Most recent turns, oldest first (client trims to ~12) */
  history: ChatTurn[];
  context: ChatContext;
}

export interface ChatResponse {
  /** 1-3 short sentences, already TTS-friendly (numbers/units spelled out) */
  reply: string;
  actions: SousAction[];
  source: "gemini" | "fallback";
}

export interface VoiceOption {
  id: string;
  name: string;
  /** e.g. "Warm, Captivating Storyteller" */
  description: string;
  previewUrl?: string;
  gender?: string;
  accent?: string;
}

export interface VoicesResponse {
  voices: VoiceOption[];
  source: "elevenlabs" | "fallback";
}

/** POST /api/tts body. Success = audio/mpeg bytes. Failure = JSON TtsError with non-200 status. */
export interface TtsRequest {
  text: string;
  voiceId?: string;
}

export interface TtsError {
  error: string;
  /** Client should fall back to browser speechSynthesis */
  fallback: true;
}

/* ------------------------------------------------------------------ */
/* Vision + moderation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Images reach the server either as base64 (camera/upload, downscaled client-side)
 * or as a URL (sample photos and recipe images; server fetches allow-listed hosts only).
 */
export type ImageInput = { base64: string; mimeType: string } | { url: string };

export interface IngredientsRequest {
  image: ImageInput;
}

export interface IngredientsResponse {
  ingredients: string[];
  source: "gemini" | "fallback";
}

export interface MealEstimate {
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** e.g. "1 plate (about 450 g)" */
  portion: string;
  confidence: "low" | "medium" | "high";
  /** Vitamins, minerals, sugar, sodium... (estimates) */
  micros?: Partial<Micros>;
}

/** POST /api/nutrition/estimate: estimate foods described in words ("chicken wrap and a latte") */
export interface FoodEstimateRequest {
  text: string;
  meal?: MealType;
}

export interface FoodEstimateResponse {
  items: SpokenFood[];
  source: "gemini" | "fallback";
}

export interface MealEstimateRequest {
  image: ImageInput;
  /** Recipe the user just cooked, used as a hint and for the fallback */
  recipeId?: number;
  dishHint?: string;
}

export interface MealEstimateResponse {
  estimate: MealEstimate;
  source: "gemini" | "fallback";
}

export interface ModerationRequest {
  image: ImageInput;
  caption: string;
  dishName?: string;
}

export interface ModerationResponse {
  allowed: boolean;
  /** Friendly, user-facing explanation when blocked; short confirmation when allowed */
  reason: string;
  source: "gemini" | "fallback";
}

/* ------------------------------------------------------------------ */
/* Recipe APIs                                                         */
/* ------------------------------------------------------------------ */

export interface ByIngredientsResponse {
  matches: RecipeMatch[];
  source: "live" | "cache";
}

export interface RecipeResponse {
  recipe: Recipe;
  source: "live" | "cache";
}

export interface RecipeSearchResponse {
  query: string;
  /** Title / main-ingredient matches */
  matches: Recipe[];
  /** Recipes that pair the query with other things (e.g. "chicken" + rice) */
  combinations: Recipe[];
  /** Same cuisine / dish type as the top matches */
  similar: Recipe[];
  source: "live" | "cache";
}
