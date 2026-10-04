/**
 * Which recipe ingredients a step mentions, so the step card can show exact amounts
 * ("2 tbsp butter") right where you need them. Pure.
 */
import type { Ingredient } from "@/lib/types";

/** Head nouns too generic to match on their own */
const WEAK = new Set(["sauce", "powder", "paste", "oil", "juice", "stock", "broth", "seasoning", "mix", "leaves", "seeds", "water", "salt", "pepper"]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function singular(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function mentions(text: string, phrase: string): boolean {
  return new RegExp(String.raw`\b${escape(phrase)}(?:e?s)?\b`, "i").test(text);
}

export function ingredientsInStep(stepText: string, ingredients: Ingredient[], max = 4): Ingredient[] {
  const out: Ingredient[] = [];
  for (const ing of ingredients) {
    const name = ing.name.toLowerCase().trim();
    if (!name) continue;
    const words = name.split(/\s+/).filter(Boolean);
    const head = singular(words[words.length - 1] ?? "");
    const hit = mentions(stepText, singular(name)) || (head.length > 2 && !WEAK.has(head) && mentions(stepText, head));
    if (hit && !out.some((o) => o.original === ing.original)) out.push(ing);
    if (out.length >= max) break;
  }
  return out;
}
