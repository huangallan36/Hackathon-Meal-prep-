/**
 * Ingredient-name hygiene shared by the kitchen API routes and the client.
 * Pure functions: safe to import anywhere.
 */
import type { ImageInput } from "@/lib/types";

export const MAX_INGREDIENTS = 25;
export const MAX_INGREDIENT_LENGTH = 40;
/** Vision results are capped lower than user input */
export const MAX_DETECTED = 20;

export interface DetectedIngredient {
  name: string;
  confidence: "high" | "medium" | "low";
}

/** Accents left over after NFD normalization ("jalapeño" -> "jalapeno") */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

const JUNK = new Set(["", "none", "unknown", "food", "ingredient", "ingredients", "item", "items", "n/a"]);

/**
 * "  3 Ripe Tomatoes (vine) " -> "ripe tomatoes", "Jalapeño" -> "jalapeno".
 * Returns null when nothing usable is left.
 * Keeps letters, digits inside words, spaces, hyphens, apostrophes and "&".
 */
export function normalizeIngredientName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input
    .slice(0, 200)
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s'&-]/g, " ")
    .replace(/^\s*[\d\s/.-]+(?=[a-z])/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_INGREDIENT_LENGTH)
    .trim();
  return JUNK.has(name) || !/[a-z]/.test(name) ? null : name;
}

/** Loose identity so "egg" / "eggs" and "tomato" / "tomatoes" collapse to one chip */
export function dedupeKey(name: string): string {
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (name.endsWith("oes")) return name.slice(0, -2);
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

/** Normalize, dedupe and cap a list of names, keeping the first spelling seen. */
export function uniqueIngredients(list: readonly unknown[], max = MAX_INGREDIENTS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const name = normalizeIngredientName(item);
    if (!name) continue;
    const key = dedupeKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Post-process Gemini's detections: drop malformed rows, drop low-confidence guesses
 * when there are already 6+ solid items, then normalize + dedupe.
 */
export function cleanIngredientList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const rows = items.filter(
    (i): i is DetectedIngredient =>
      Boolean(i) && typeof i === "object" && typeof (i as DetectedIngredient).name === "string",
  );
  const solid = rows.filter((r) => r.confidence !== "low");
  const kept = solid.length >= 6 ? solid : rows;
  return uniqueIngredients(
    kept.map((r) => r.name),
    MAX_DETECTED,
  );
}

/** `?ingredients=a,b,c` -> validated list (max 25, each <= 40 chars) */
export function parseIngredientsParam(raw: string | null): string[] {
  if (!raw) return [];
  return uniqueIngredients(raw.slice(0, 2000).split(","));
}

/** Shape check for the vision request body (imagePart does the deeper validation) */
export function isImageInput(value: unknown): value is ImageInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.base64 === "string") {
    return v.base64.length > 0 && typeof v.mimeType === "string" && /^image\/[a-z0-9.+-]+$/i.test(v.mimeType);
  }
  if (typeof v.url === "string") {
    const url = v.url;
    if (url.startsWith("data:image/")) return true;
    return url.length <= 2048 && (url.startsWith("https://") || (url.startsWith("/") && !url.startsWith("//")));
  }
  return false;
}
