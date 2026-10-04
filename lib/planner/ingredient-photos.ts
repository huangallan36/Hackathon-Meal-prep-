/**
 * Our own ingredient photos (public/ingredients, from the Figma design; credited in
 * public/CREDITS.md). The planner's "Cuts" chips and "Combinations" discs prefer these over
 * the recipes' Spoonacular thumbnails (product shots on white), so a beef search looks like
 * the design: browned ground beef, a seared steak, a bowl of rice...
 */

/** Matched on the ingredient's words (singular, lowercase): every word must be there, the last one as the head noun */
const PHOTOS: readonly { words: readonly string[]; src: string }[] = [
  { words: ["ground", "beef"], src: "/ingredients/ground-beef.png" },
  { words: ["short", "rib"], src: "/ingredients/short-rib.png" },
  { words: ["brisket"], src: "/ingredients/brisket.png" },
  { words: ["steak"], src: "/ingredients/steak.png" },
  { words: ["broccoli"], src: "/ingredients/broccoli.png" },
  { words: ["rice"], src: "/ingredients/rice.png" },
  { words: ["potato"], src: "/ingredients/potato.png" },
];

/** Words that make it a different food: "sweet potato", "rice vinegar" is caught by the head noun rule */
const NOT_THE_SAME = new Set(["sweet", "cauliflower"]);

function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (/(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * The photo we have for an ingredient name, if any: "lean ground beef" -> ground beef,
 * "flank steak" -> steak, "beef short ribs" -> short rib, "jasmine rice" -> rice, but not
 * "rice vinegar", "beef broth" or "sweet potato".
 */
export function ingredientPhoto(name: string): string | undefined {
  const w = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
  if (!w.length || w.some((x) => NOT_THE_SAME.has(x))) return undefined;
  const head = w[w.length - 1];
  return PHOTOS.find((p) => p.words[p.words.length - 1] === head && p.words.every((x) => w.includes(x)))?.src;
}
