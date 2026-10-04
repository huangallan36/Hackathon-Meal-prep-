#!/usr/bin/env node
/**
 * Generates the seeded users' avatars as static SVGs in public/avatars/.
 *
 *   npm run avatars
 *
 * Style: DiceBear "Notionists" by Zoish, CC0 1.0 (public domain, no attribution
 * required; we credit it anyway in README.md and public/CREDITS.md). Output is
 * deterministic: the same handle always produces the same face.
 *
 * The list of files comes from the app itself: every "/avatars/<name>.svg" path
 * referenced in lib/seed/social.ts (SEED_USERS) and lib/config.ts (DEMO_USER),
 * so adding a seed user and re-running this script is all it takes.
 */
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "avatars");
const SOURCES = ["lib/seed/social.ts", "lib/config.ts"];

/**
 * Friendly faces only: smiling mouths (no tongues, frowns, gritted teeth or "oh!"),
 * relaxed or raised brows (no scowls) and open or soft eyes (no winks).
 */
const SMILES = ["variant03", "variant14", "variant22", "variant23", "variant25"];
const BROWS = ["variant01", "variant04", "variant05", "variant09", "variant12"];
const EYES = ["variant01", "variant04", "variant05"];

/** Warm backgrounds that sit well on the cream UI (hex without #) */
const BACKGROUNDS = ["ffe4d9", "fff3d1", "e2f2e7", "fbefe2", "fde2cf", "f3e8d8"];

/**
 * Hand-tuned looks so faces read the way the seeded bios do, with backgrounds
 * spread out so neighbours in the feed differ. Anything not listed falls back
 * to the seed alone. Keys are avatar file names.
 */
const LOOKS = {
  "maya.makes": { seed: "maya.makes", bg: "fff3d1", hair: ["variant48"], beardProbability: 0 },
  "dev.eats": { seed: "dev.eats", bg: "e2f2e7", hair: ["variant38"], beardProbability: 0, glassesProbability: 100, glasses: ["variant03", "variant08", "variant11"] },
  "sofia.sazon": { seed: "sofia.sazon", bg: "ffe4d9", hair: ["variant28"], beardProbability: 0 },
  "jordan.grills": { seed: "jordan.grills", bg: "fff3d1", hair: ["variant22"], beardProbability: 100 },
  "priya.plates": { seed: "priya.plates", bg: "e2f2e7", hair: ["variant41"], beardProbability: 0 },
  "liam.loaf": { seed: "liam.loaf", bg: "fbefe2", hair: ["variant20"], beardProbability: 100 },
  "hana.bento": { seed: "hana.bento", bg: "ffe4d9", hair: ["variant46"], beardProbability: 0 },
  "noah.kitchen": { seed: "noah.kitchen", bg: "fff3d1", hair: ["variant14"], beardProbability: 0 },
  alex: { seed: "alex.cooks", bg: "ffe4d9", hair: ["variant27"], beardProbability: 0 },
};

/** Stable small hash so each avatar keeps the same background color */
function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Every avatar the app references, plus the hand-tuned ones (in case a path is built dynamically) */
async function avatarNames() {
  const names = new Set(Object.keys(LOOKS));
  for (const rel of SOURCES) {
    const text = await readFile(path.join(ROOT, rel), "utf8").catch(() => "");
    for (const m of text.matchAll(/["']\/avatars\/([a-z0-9._-]+)\.svg["']/gi)) names.add(m[1]);
  }
  return [...names];
}

async function main() {
  const names = await avatarNames();
  if (names.length === 0) {
    console.error("No /avatars/*.svg paths found in", SOURCES.join(", "));
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  for (const name of names) {
    const { bg, ...look } = LOOKS[name] ?? { seed: name };
    const svg = createAvatar(notionists, {
      size: 128,
      radius: 50,
      backgroundColor: [bg ?? BACKGROUNDS[hash(name) % BACKGROUNDS.length]],
      backgroundType: ["solid"],
      bodyIconProbability: 0,
      gestureProbability: 0,
      glassesProbability: 0,
      lips: SMILES,
      brows: BROWS,
      eyes: EYES,
      ...look,
    }).toString();
    await writeFile(path.join(OUT_DIR, `${name}.svg`), svg, "utf8");
    console.log(`  public/avatars/${name}.svg  (${(svg.length / 1024).toFixed(1)} KB)`);
  }
  console.log(`Generated ${names.length} avatars (DiceBear Notionists, CC0 1.0).`);
}

main().catch((err) => {
  console.error("Avatar generation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
