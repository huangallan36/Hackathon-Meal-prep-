/**
 * Turn recipe / chat text into something a TTS voice reads naturally:
 * "Bake at 350°F for 25-30 min, add 1 1/2 tbsp oil" ->
 * "Bake at 350 degrees Fahrenheit for 25 to 30 minutes, add one and a half tablespoons oil".
 * Pure functions, safe on server and client.
 */
import type { RecipeStep } from "@/lib/types";

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];

function numberWord(n: number): string {
  return Number.isInteger(n) && n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

/** [on its own, after a whole number ("one and ...")] */
const FRACTIONS: Record<string, [string, string]> = {
  "1/2": ["one half", "a half"],
  "1/3": ["one third", "a third"],
  "2/3": ["two thirds", "two thirds"],
  "1/4": ["a quarter", "a quarter"],
  "3/4": ["three quarters", "three quarters"],
  "1/8": ["an eighth", "an eighth"],
  "3/8": ["three eighths", "three eighths"],
  "5/8": ["five eighths", "five eighths"],
  "7/8": ["seven eighths", "seven eighths"],
};

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

/** [pattern (matched right after an amount), singular, plural]. Case-sensitive on purpose: T = tablespoon, t = teaspoon. */
const UNITS: [string, string, string][] = [
  ["[Tt][Bb][Ss][Pp][Ss]?|[Tt][Bb][Ll]?[Ss]?|T", "tablespoon", "tablespoons"],
  ["[Tt][Ss][Pp][Ss]?|t", "teaspoon", "teaspoons"],
  ["[Oo][Zz]", "ounce", "ounces"],
  ["[Ll][Bb][Ss]?", "pound", "pounds"],
  ["[Kk][Gg][Ss]?", "kilogram", "kilograms"],
  ["[Mm][Gg]", "milligram", "milligrams"],
  ["g|gr|grs", "gram", "grams"],
  ["[Mm][Ll]", "milliliter", "milliliters"],
  ["[Ll]", "liter", "liters"],
  ["[Mm]ins?", "minute", "minutes"],
  ["[Hh]rs?|h", "hour", "hours"],
  ["[Ss]ecs?", "second", "seconds"],
  ["cm", "centimeter", "centimeters"],
  ["mm", "millimeter", "millimeters"],
  ["[Qq]ts?", "quart", "quarts"],
  ["[Pp]kgs?", "package", "packages"],
];

const AMOUNT = String.raw`(\d+(?:\.\d+)?\s+\d\/\d{1,2}|\d\/\d{1,2}|\d+(?:\.\d+)?)`;
const UNIT_RES = UNITS.map(
  ([pattern, one, many]) => [new RegExp(`${AMOUNT}\\s*(?:${pattern})(?![\\w/])`, "g"), one, many] as const,
);

// Built at runtime so the ES2017 target doesn't reject the Unicode property escape.
const EMOJI_RE = new RegExp(
  "[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\u{1F3FB}-\\u{1F3FF}\\u{FE0F}\\u{200D}\\u{20E3}]",
  "gu",
);

function isSingular(amount: string): boolean {
  const a = amount.trim();
  if (/^1(?:\.0+)?$/.test(a)) return true;
  // A bare fraction ("1/2 tsp") is less than one
  const f = /^(\d)\/(\d{1,2})$/.exec(a);
  return !!f && Number(f[1]) < Number(f[2]);
}

/** Markdown, emoji, links and bracketed notes out; keeps numbers and units as written. */
export function toDisplay(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|\/)[^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?;:]|$)/g, "$1$2")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+•]\s+/gm, "")
    .replace(EMOJI_RE, "")
    .replace(/[*#|`]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n+\s*/g, "\n")
    .trim();
}

/** Full TTS normalization (superset of toDisplay). */
export function toSpeech(text: string): string {
  let s = toDisplay(text);

  // Line breaks become sentence breaks
  s = s.replace(/([^.!?:;,])\n/g, "$1. ").replace(/\n/g, " ");

  // Bracketed notes go; parenthetical asides become a spoken aside
  s = s
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s*\(([^()]*)\)/g, (_m, inner: string) => (inner.trim() ? `, ${inner.trim()},` : ""));

  // Unicode fractions: "1½" -> "1 1/2", "¼" -> "1/4"
  s = s
    .replace(/⁄/g, "/")
    .replace(/(\d)?\s*([½⅓⅔¼¾⅛⅜⅝⅞])/g, (_m, whole: string | undefined, f: string) =>
      whole ? `${whole} ${UNICODE_FRACTIONS[f]}` : ` ${UNICODE_FRACTIONS[f]}`,
    );

  // Temperatures
  s = s
    .replace(/(\d)\s*°\s*F\b/g, "$1 degrees Fahrenheit")
    .replace(/(\d)\s*°\s*C\b/g, "$1 degrees Celsius")
    .replace(/(\d)\s*(?:degrees?|deg\.?)\s*F\b/gi, "$1 degrees Fahrenheit")
    .replace(/(\d)\s*(?:degrees?|deg\.?)\s*C\b/gi, "$1 degrees Celsius")
    .replace(/\b(\d{3})\s?F\b/g, "$1 degrees Fahrenheit")
    .replace(/\b(\d{3})\s?C\b/g, "$1 degrees Celsius")
    .replace(/(\d)\s*°/g, "$1 degrees");

  // Ranges and multipliers
  s = s
    .replace(/(\d)\s*[-–—]\s*(?=\d)/g, "$1 to ")
    .replace(/(\d)\s*[x×]\s*(?=\d)/g, "$1 by ")
    .replace(/(\d)\s*[x×](?=[\s,.;:!?)]|$)/g, "$1 times");

  // Units after an amount, singular or plural
  for (const [re, one, many] of UNIT_RES) {
    s = s.replace(re, (_m, amount: string) => `${amount} ${isSingular(amount) ? one : many}`);
  }

  // Fractions: mixed numbers first, then bare ones (never dates like 3/4/2026 or 24/7)
  s = s
    .replace(/\b(\d+)\s+(\d\/\d{1,2})(?![\d/])/g, (m, whole: string, f: string) =>
      FRACTIONS[f] ? `${numberWord(Number(whole))} and ${FRACTIONS[f][1]}` : m,
    )
    .replace(/(^|[^\d/])(\d\/\d{1,2})(?![\d/])/g, (m, before: string, f: string) =>
      FRACTIONS[f] ? `${before}${FRACTIONS[f][0]}` : m,
    );

  // Symbols and abbreviations
  s = s
    .replace(/~\s*(?=\d)/g, "about ")
    .replace(/\bapprox\.?(?=\s)/gi, "about")
    .replace(/\be\.g\.,?/gi, "for example")
    .replace(/\bi\.e\.,?/gi, "that is")
    .replace(/\bw\/(?=\s|\w)/gi, "with ")
    .replace(/\s*&\s*/g, " and ")
    .replace(/(\d)\s*%/g, "$1 percent")
    .replace(/\s+\+\s+/g, " plus ")
    .replace(/[_~^<>]/g, " ");

  // Tidy punctuation and spacing
  return s
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*([,.;:!?])/g, "$1")
    .replace(/([.;:!?])\s*,/g, "$1")
    .replace(/^[\s,.;:]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** "Step 3 of 8. Whisk the eggs..." (index is 0-based). */
export function stepSpeech(step: RecipeStep | string, index: number, total: number): string {
  const text = typeof step === "string" ? step : step.text;
  const minutes = typeof step === "string" ? undefined : step.minutes;
  let body = toSpeech(text);
  if (body && !/[.!?]$/.test(body)) body += ".";
  const timing =
    minutes && minutes >= 2 && !/\bminutes?\b/i.test(body) ? ` This takes about ${numberWord(minutes)} minutes.` : "";
  return `Step ${index + 1} of ${total}. ${body}${timing}`.trim();
}
