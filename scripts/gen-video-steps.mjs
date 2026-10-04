#!/usr/bin/env node
/**
 * Asks Gemini to watch each catalog recipe's YouTube video (data/youtube.json) and find where
 * every recipe step (data/recipes.json) starts. Writes data/video-steps.json:
 *
 *   { "<recipeId>": [seconds | null, ...one per step] }
 *
 * The in-app player (components/cooking/TutorialCard.tsx) then starts the video at the current
 * step. null = the video doesn't show that step. Recipes whose video Gemini can't process are
 * left out (they play from 0).
 *
 *   npm run video-steps            # all catalog recipes
 *   npm run video-steps -- 910010  # just one (merged into the existing file)
 *
 * Needs GEMINI_API_KEY (environment or .env.local).
 */
import { GoogleGenAI } from "@google/genai";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "video-steps.json");
const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.7-flash"];
const CONCURRENCY = 3;

async function apiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  try {
    const env = await readFile(path.join(ROOT, ".env.local"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("GEMINI_API_KEY="));
    return line?.slice("GEMINI_API_KEY=".length).trim().replace(/^["']|["']$/g, "") || null;
  } catch {
    return null;
  }
}

function thinkingFor(model) {
  if (/gemini-3\.(7|8)-flash/.test(model)) return { thinkingLevel: "LOW" };
  if (/gemini-3\.[56]-flash/.test(model)) return { thinkingLevel: "MINIMAL" };
  return undefined;
}

const SCHEMA = {
  type: "object",
  properties: {
    durationSeconds: { type: "integer", description: "Total length of the video in seconds" },
    steps: {
      type: "array",
      description: "One entry per recipe step, in the same order",
      items: {
        type: "object",
        properties: {
          step: { type: "integer", description: "The step number (1-based)" },
          startSeconds: {
            type: ["integer", "null"],
            description: "Whole seconds into the video where this step's action begins, or null if the video doesn't show it",
          },
        },
        required: ["step", "startSeconds"],
      },
    },
  },
  required: ["durationSeconds", "steps"],
};

function prompt(recipe, steps) {
  return [
    `This is a cooking video for "${recipe.title}". Here are the recipe's steps:`,
    "",
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Watch the video. For each step, give the time in whole seconds from the start of the video where the cook",
    "begins doing that step's action on screen (not where it is merely mentioned in an intro or summary).",
    "Use null when the video does not show that step at all. The video may do things in a slightly different",
    "order or combine steps; pick the moment that best matches each step. Times must increase with the step",
    "number when present. Also give the video's total duration in seconds.",
  ].join("\n");
}

/** Keep only values that are integers, within the video and strictly after the previous kept value. */
function sanitize(data, count) {
  const duration = Number.isFinite(data?.durationSeconds) && data.durationSeconds > 0 ? Math.round(data.durationSeconds) : null;
  if (!duration) throw new Error("no duration");
  const byStep = new Map();
  for (const s of Array.isArray(data.steps) ? data.steps : []) {
    if (Number.isInteger(s?.step)) byStep.set(s.step, s.startSeconds);
  }
  const out = [];
  let prev = -1;
  let dropped = 0;
  for (let i = 0; i < count; i++) {
    const v = byStep.get(i + 1);
    if (typeof v !== "number" || !Number.isFinite(v)) {
      out.push(null);
      continue;
    }
    const sec = Math.round(v);
    if (sec < 0 || sec >= duration || sec <= prev) {
      dropped++;
      out.push(null);
      continue;
    }
    out.push(sec);
    prev = sec;
  }
  const known = out.filter((v) => v != null).length;
  if (known === 0) throw new Error("no step times");
  if (dropped > count / 3) throw new Error(`${dropped}/${count} times invalid`);
  return { duration, times: out };
}

async function analyse(ai, recipe, videoId, steps) {
  let lastErr = null;
  for (const model of MODELS) {
    const started = Date.now();
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` } }, { text: prompt(recipe, steps) }],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: SCHEMA,
          thinkingConfig: thinkingFor(model),
          abortSignal: AbortSignal.timeout(180_000),
        },
      });
      const parts = res.candidates?.[0]?.content?.parts ?? [];
      const raw = parts
        .filter((p) => typeof p.text === "string" && !p.thought)
        .map((p) => p.text)
        .join("")
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "");
      const result = sanitize(JSON.parse(raw), steps.length);
      return { ...result, model, ms: Date.now() - started };
    } catch (err) {
      lastErr = err;
      console.warn(`${recipe.id} ${model} failed after ${Date.now() - started}ms: ${String(err?.message ?? err).slice(0, 200)}`);
    }
  }
  throw lastErr ?? new Error("all models failed");
}

const fmt = (s) => (s == null ? "  -  " : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

async function main() {
  const key = await apiKey();
  if (!key) {
    console.error("Add GEMINI_API_KEY to .env.local, then run npm run video-steps");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey: key });
  const recipes = JSON.parse(await readFile(path.join(ROOT, "data", "recipes.json"), "utf8"));
  const youtube = JSON.parse(await readFile(path.join(ROOT, "data", "youtube.json"), "utf8"));
  let existing = {};
  try {
    existing = JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    /* first run */
  }

  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const todo = recipes.filter((r) => youtube[String(r.id)] && (!only.length || only.includes(String(r.id))));
  const results = only.length ? { ...existing } : {};
  let failed = 0;

  const queue = [...todo];
  async function worker() {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const steps = (r.analyzedInstructions ?? []).flatMap((s) => s.steps ?? []).map((s) => s.step?.trim()).filter(Boolean);
      try {
        const { duration, times, model, ms } = await analyse(ai, r, youtube[String(r.id)], steps);
        results[String(r.id)] = times;
        console.log(`${r.id} ${r.title.padEnd(26)} ${model} ${(ms / 1000).toFixed(0)}s  dur ${fmt(duration)}  ${times.map(fmt).join(" ")}`);
      } catch {
        failed++;
        delete results[String(r.id)];
        console.warn(`${r.id} ${r.title}: left out`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const sorted = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)));
  const body = `{\n${Object.entries(sorted)
    .map(([id, t]) => `  "${id}": ${JSON.stringify(t)}`)
    .join(",\n")}\n}\n`;
  await writeFile(OUT, body);
  console.log(`Wrote ${Object.keys(sorted).length} recipes to data/video-steps.json${failed ? ` (${failed} failed)` : ""}`);
}

main();
