/** App-wide constants that are safe on the client. Server-only config lives in lib/server/*. */

export const APP_NAME = "Sous";

/** The single hardcoded demo user */
export const DEMO_USER = {
  name: "Alex",
  handle: "alex.cooks",
  avatar: "/avatars/alex.svg",
  bio: "Engineer by day, slightly chaotic home cook by night. Learning one recipe at a time.",
  location: "Burnaby, BC",
} as const;

/** Bump to wipe everyone's persisted demo state after a breaking store change */
export const STORAGE_VERSION = "v1";
export const storageKey = (name: string) => `sous:${STORAGE_VERSION}:${name}`;

/** Default daily targets for the Diary tab */
export const DEFAULT_GOALS = {
  calories: 2100,
  protein: 120,
  carbs: 240,
  fat: 70,
  fiber: 30,
  iron: 18,
  calcium: 1000,
  vitaminA: 900,
} as const;

/** Client-side timeouts (ms). Server routes have their own, shorter, upstream timeouts. */
export const TIMEOUTS = {
  chat: 12_000,
  tts: 10_000,
  vision: 25_000,
  recipes: 10_000,
  moderation: 15_000,
} as const;

/** Spoonacular attribution required by their terms on the free/hackathon plan */
export const SPOONACULAR_BACKLINK = "https://spoonacular.com/food-api";
