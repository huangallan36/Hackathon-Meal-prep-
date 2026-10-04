/**
 * Splits a recipe step into the Figma cooking screen's two lines: a short headline (the
 * first sentence, "Dice the onion into small, even pieces") and the rest as the detail
 * ("Keep the root end on so it holds together while you cut."). Pure.
 */

/** Abbreviations whose period does not end a sentence ("1 tbsp. butter", "e.g. basil") */
const ABBREVIATION = /\b(?:tbsp|tsp|oz|lbs?|pkg|qt|pt|approx|vs|e\.g|i\.e|etc)\.$/i;

/** A sentence end: . ! or ? followed by whitespace and something that can start a sentence */
const SENTENCE_END = /[.!?](?=\s+["“‘'(]?[A-Z0-9])/g;

export interface StepParts {
  /** First sentence, without a trailing period */
  title: string;
  /** Everything after it ("" for one-sentence steps) */
  detail: string;
}

export function splitStep(text: string): StepParts {
  const t = text.replace(/\s+/g, " ").trim();
  for (const m of t.matchAll(SENTENCE_END)) {
    const end = (m.index ?? 0) + 1;
    const head = t.slice(0, end);
    if (ABBREVIATION.test(head)) continue;
    const detail = t.slice(end).trim();
    if (!detail) break;
    return { title: head.replace(/\.$/, ""), detail };
  }
  return { title: t.replace(/\.$/, ""), detail: "" };
}
