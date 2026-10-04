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
  const parsed = ingredients.map((ing) => {
    const name = ing.name.toLowerCase().trim();
    const words = name.split(/\s+/).filter(Boolean);
    return { ing, name, head: singular(words[words.length - 1] ?? "") };
  });
  // Distinct ingredient names per head noun: "green onions" and "yellow onion" share "onion"
  const sharing = new Map<string, Set<string>>();
  for (const p of parsed) if (p.name) sharing.set(p.head, (sharing.get(p.head) ?? new Set()).add(p.name));

  const out: Ingredient[] = [];
  for (const { ing, name, head } of parsed) {
    if (!name) continue;
    // A bare head noun ("Dice the onion") is ambiguous when two ingredients share it, so it only
    // counts for an ingredient that is the only one with that head.
    const byHead =
      head.length > 2 && !WEAK.has(head) && (sharing.get(head)?.size ?? 0) < 2 && mentions(stepText, head);
    const hit = mentions(stepText, singular(name)) || byHead;
    if (hit && !out.some((o) => o.original === ing.original)) out.push(ing);
    if (out.length >= max) break;
  }
  return out;
}
