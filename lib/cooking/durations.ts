/**
 * Finds cooking durations in recipe step text ("simmer for 10-12 minutes") so cooking
 * mode can offer one-tap timers. Pure and dependency-free (no runtime imports), so it
 * runs on client, server and in plain Node test scripts.
 */
import type { RecipeStep } from "@/lib/types";

export interface DetectedDuration {
  seconds: number;
  /** The phrase as written, e.g. "10-12 minutes" */
  phrase: string;
  /** Character offset of the phrase in the text */
  index: number;
}

export interface StepTimer {
  seconds: number;
  /** Short name for the pill and the "timer done" line, e.g. "Simmer" */
  label: string;
}

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, "twenty-five": 25, thirty: 30, forty: 40, "forty-five": 45,
  fifty: 50, sixty: 60, ninety: 90,
};

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

const WORD_ALT = Object.keys(WORD_NUMBERS)
  .sort((x, y) => y.length - x.length)
  .join("|");

/** 20 | 1.5 | 1 1/2 | 1/2 | 1½ | ½ | twenty | an */
const NUM = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*[½¼¾⅓⅔]|\d+(?:\.\d+)?|(?:${WORD_ALT})(?![\w-]))`;
const UNIT = String.raw`(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b`;

/**
 * Groups: 1 = first number, 2 = range upper bound, 3 = "and a half" before the unit,
 * 4 = unit, 5 = "and a half" after the unit ("an hour and a half").
 */
const DURATION_RE = new RegExp(
  String.raw`(?<![\w.\/])(${NUM})(?:\s*(?:-|–|—|to|or)\s*(${NUM}))?(\s+and\s+a\s+half)?\s*-?\s*${UNIT}(\s+and\s+a\s+half)?`,
  "gi",
);
const HALF_RE = /\bhalf\s+(?:an?\s+)(hour|minute)\b/gi;

const MIN_SECONDS = 5;
const MAX_SECONDS = 24 * 3600;

function toNumber(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (s in WORD_NUMBERS) return WORD_NUMBERS[s];
  const uni = /^(\d*)([½¼¾⅓⅔])$/.exec(s);
  if (uni) return (uni[1] ? Number(uni[1]) : 0) + UNICODE_FRACTIONS[uni[2]];
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[2]) && Number(mixed[3]) ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) : null;
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function unitSeconds(unit: string): number {
  const u = unit.toLowerCase();
  if (u.startsWith("h")) return 3600;
  if (u.startsWith("m")) return 60;
  return 1;
}

interface RawMatch extends DetectedDuration {
  end: number;
  unit: number;
}

/**
 * Every concrete duration in `text`. Ranges use the upper bound ("10-12 minutes" -> 12 min),
 * compound phrases are merged ("1 hour and 15 minutes" -> 75 min) and vague ones
 * ("a few minutes", "several hours") are ignored.
 */
export function parseDurations(text: string): DetectedDuration[] {
  const found: RawMatch[] = [];

  // "half an hour" first, so the "an hour" inside it is not read as a full hour.
  for (const m of text.matchAll(HALF_RE)) {
    const unit = unitSeconds(m[1]);
    const index = m.index ?? 0;
    found.push({ seconds: Math.round(unit / 2), phrase: m[0].trim(), index, end: index + m[0].length, unit });
  }
  const halves = [...found];

  for (const m of text.matchAll(DURATION_RE)) {
    const index = m.index ?? 0;
    if (halves.some((h) => index >= h.index && index < h.end)) continue;
    const first = toNumber(m[1]);
    const upper = m[2] ? toNumber(m[2]) : null;
    const base = upper ?? first;
    if (base == null) continue;
    const half = m[3] || m[5] ? 0.5 : 0;
    const unit = unitSeconds(m[4]);
    // "a second" is almost always figurative ("for a second"), skip it
    if (unit === 1 && /^an?$/i.test(m[1].trim())) continue;
    found.push({ seconds: Math.round((base + half) * unit), phrase: m[0].trim(), index, end: index + m[0].length, unit });
  }

  found.sort((a, b) => a.index - b.index);

  // Merge "1 hour and 15 minutes" / "2 hours, 30 minutes" into one duration.
  const merged: RawMatch[] = [];
  for (const cur of found) {
    const prev = merged[merged.length - 1];
    if (prev && prev.unit > cur.unit && /^\s*(?:,\s*)?(?:and\s+)?$/i.test(text.slice(prev.end, cur.index))) {
      prev.seconds += cur.seconds;
      prev.phrase = text.slice(prev.index, cur.end).trim();
      prev.end = cur.end;
      prev.unit = cur.unit;
      continue;
    }
    merged.push({ ...cur });
  }

  return merged
    .filter((d) => d.seconds >= MIN_SECONDS && d.seconds <= MAX_SECONDS)
    .map(({ seconds, phrase, index }) => ({ seconds, phrase, index }));
}

/* ------------------------------------------------------------------ */
/* Timer labels                                                        */
/* ------------------------------------------------------------------ */

const VERBS = [
  "preheat", "bake", "roast", "boil", "simmer", "cook", "fry", "sear", "saute", "sauté", "steam", "grill", "broil",
  "toast", "rest", "marinate", "chill", "refrigerate", "freeze", "soak", "rise", "proof", "cool", "microwave",
  "braise", "reduce", "caramelize", "brown", "blanch", "poach", "knead", "whisk", "blend", "stir", "steep",
  "heat", "melt", "sit", "stand", "mix", "beat", "process", "smoke", "toss", "set",
];
const VERB_RE = new RegExp(String.raw`\b(${VERBS.join("|")})(?:s|es)?\b`, "gi");

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/** The cooking verb nearest before the duration in the same sentence ("Cover and simmer for 20 minutes" -> "Simmer") */
export function timerLabel(text: string, index: number, stepNumber: number): string {
  const sentenceStart = Math.max(text.lastIndexOf(". ", index), text.lastIndexOf("; ", index)) + 1;
  const before = text.slice(sentenceStart, index);
  const verbs = [...before.matchAll(VERB_RE)];
  const verb = verbs[verbs.length - 1]?.[1] ?? [...text.slice(sentenceStart).matchAll(VERB_RE)][0]?.[1];
  return verb ? capitalize(verb) : `Step ${stepNumber}`;
}

/** Up to three distinct timers for a step: parsed from the text, else Spoonacular's step length. */
export function stepTimers(step: RecipeStep, max = 3): StepTimer[] {
  const out: StepTimer[] = [];
  for (const d of parseDurations(step.text)) {
    if (out.some((t) => t.seconds === d.seconds)) continue;
    out.push({ seconds: d.seconds, label: timerLabel(step.text, d.index, step.number) });
    if (out.length >= max) break;
  }
  if (!out.length && step.minutes && step.minutes > 0) {
    out.push({ seconds: Math.round(step.minutes * 60), label: timerLabel(step.text, step.text.length, step.number) });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** 1200 -> "20:00", 300 -> "5:00", 5400 -> "1:30:00", 45 -> "0:45" (Figma "Start 5:00 timer") */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/* ------------------------------------------------------------------ */
/* Time left                                                           */
/* ------------------------------------------------------------------ */

/** How long a step takes: Spoonacular's step length, else the durations in its text; null if unknown */
export function stepSeconds(step: RecipeStep): number | null {
  if (step.minutes && step.minutes > 0) return Math.round(step.minutes * 60);
  const found = parseDurations(step.text);
  return found.length ? found.reduce((sum, d) => sum + d.seconds, 0) : null;
}

/**
 * Rough minutes left from step `index` (inclusive) to the end, for "~18 min left".
 * Steps with a known length count as written; the rest share whatever is left of
 * readyInMinutes (at least a minute each).
 */
export function minutesLeft(recipe: { steps: RecipeStep[]; readyInMinutes: number }, index: number): number {
  const known = recipe.steps.map(stepSeconds);
  const knownTotal = known.reduce<number>((sum, s) => sum + (s ?? 0), 0);
  const unknown = known.filter((s) => s == null).length;
  const ready = Math.max(0, recipe.readyInMinutes || 0) * 60;
  const perUnknown = unknown ? Math.max(60, (ready - knownTotal) / unknown) : 0;
  let left = 0;
  for (let i = Math.max(0, index); i < known.length; i++) left += known[i] ?? perUnknown;
  return Math.max(1, Math.round(left / 60));
}

/** 1200 -> "20 min", 5400 -> "1 hr 30 min", 45 -> "45 sec" */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} sec`;
  const minutes = Math.round(s / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
