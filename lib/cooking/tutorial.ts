/**
 * A step's technique tutorial, as in Figma 2.3 where the dicing step carries "How to dice an
 * onion". Only a curated set of knife and pan techniques at the very start of a step's
 * headline count, so the title always reads naturally; anything else (e.g. "Add beef and
 * brown for 8 minutes") returns null and the card falls back to the recipe's own tutorial.
 * Pure.
 */

export interface StepTutorial {
  /** "How to dice an onion" */
  title: string;
  /** YouTube search query: "how to dice an onion" */
  query: string;
}

const TECHNIQUES = new Set([
  "dice", "chop", "mince", "slice", "julienne", "cube", "grate", "zest", "peel", "core", "seed", "trim",
  "crush", "smash", "shred", "quarter", "halve", "segment", "sear", "brown", "caramelize", "caramelise",
  "deglaze", "poach", "blanch", "fold", "whisk", "knead", "marinate", "butterfly", "fillet", "devein",
  "spatchcock", "temper", "toast",
]);

/** Adverbs that may open the step before the verb: "Finely chop the parsley" */
const ADVERBS = new Set(["finely", "thinly", "roughly", "coarsely", "carefully", "gently", "lightly", "quickly", "evenly"]);

/** Words skipped before the object: articles, amounts and units */
const LEADING = new Set([
  "the", "your", "a", "an", "some", "all", "both", "remaining", "of",
  "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
  "lb", "lbs", "pound", "pounds", "oz", "ounce", "ounces", "g", "gram", "grams", "clove", "cloves",
]);

/** Where the object stops: "dice the onion | into small pieces" */
const STOP = new Set([
  "into", "in", "on", "with", "for", "and", "until", "to", "then", "while", "so", "over", "at", "from",
  "or", "if", "before", "after", "about", "as", "by", "using", "under", "lengthwise", "crosswise", "very",
]);

/** Singular countable foods that take "a" / "an" ("dice an onion", not "dice onion") */
const COUNTABLE = new Set([
  "onion", "shallot", "carrot", "potato", "tomato", "pepper", "jalapeno", "jalapeño", "avocado", "mango",
  "apple", "pear", "lemon", "lime", "orange", "cucumber", "zucchini", "eggplant", "egg", "leek", "steak",
  "pineapple", "cabbage", "cauliflower", "squash", "breast", "thigh", "fillet", "bulb", "head",
]);

/** "Brown rice", "brown sugar": the colour, not the technique */
const BROWN_NOUNS = new Set(["rice", "sugar", "bread", "lentils"]);

const WORD = /^[a-zà-ÿ][a-zà-ÿ'-]*$/i;

/** "Dice the onion into small, even pieces" -> { title: "How to dice an onion", ... } */
export function stepTutorial(headline: string): StepTutorial | null {
  // First clause only, lowercase words without trailing punctuation
  const clause = headline.split(/[,;:.!?()]/)[0] ?? "";
  const words = clause.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let i = 0;
  if (ADVERBS.has(words[i])) i++;
  if (!TECHNIQUES.has(words[i]) || (words[i] === "brown" && BROWN_NOUNS.has(words[i + 1]))) return null;
  const verbs = [words[i++]];
  // "Peel and dice the potatoes"
  if (words[i] === "and" && TECHNIQUES.has(words[i + 1])) {
    verbs.push(words[i + 1]);
    i += 2;
  }
  while (i < words.length && (LEADING.has(words[i]) || /^[\d½¼¾⅓⅔/.-]+$/.test(words[i]))) i++;
  const object: string[] = [];
  while (i < words.length && object.length < 3 && !STOP.has(words[i]) && WORD.test(words[i])) object.push(words[i++]);
  if (object.length === 0) return null;

  const head = object[object.length - 1];
  const article = COUNTABLE.has(head) ? (/^[aeiou]/.test(object[0]) ? "an " : "a ") : "";
  const phrase = `how to ${verbs.join(" and ")} ${article}${object.join(" ")}`;
  return { title: phrase.charAt(0).toUpperCase() + phrase.slice(1), query: phrase };
}
