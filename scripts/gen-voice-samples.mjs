#!/usr/bin/env node
/**
 * Records each sous-chef persona's greeting (lib/voice/personas.ts) with its ElevenLabs voice
 * into public/voices/<id>.mp3. The persona picker plays these files, so picking a voice is
 * instant, works offline and costs no credits at demo time.
 *
 *   npm run voices            # all personas
 *   npm run voices -- maya    # just one
 *
 * Needs ELEVENLABS_API_KEY (environment or .env.local). Uses the highest-quality model that
 * works for the key: eleven_v4, then eleven_multilingual_v2. Re-run after editing a greeting.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERSONAS } from "../lib/voice/personas.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "voices");
const MODELS = ["eleven_v4", "eleven_multilingual_v2"];

async function apiKey() {
  if (process.env.ELEVENLABS_API_KEY?.trim()) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    const env = await readFile(path.join(ROOT, ".env.local"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("ELEVENLABS_API_KEY="));
    return line?.slice("ELEVENLABS_API_KEY=".length).trim() || null;
  } catch {
    return null;
  }
}

async function record(key, persona, model) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${persona.voiceId}?output_format=mp3_44100_128`;
  const voiceSettings =
    model === "eleven_v4"
      ? { stability: 0.5, similarity_boost: 0.8, use_speaker_boost: true }
      : { stability: 0.45, similarity_boost: 0.8, style: 0, use_speaker_boost: true, speed: 1.0 };
  const res = await fetch(url, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: persona.greeting, model_id: model, voice_settings: voiceSettings }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    let code = String(res.status);
    try {
      const detail = (await res.json()).detail;
      if (detail && !Array.isArray(detail)) code = `${res.status} ${detail.code ?? detail.status ?? ""}`.trim();
    } catch {
      /* not JSON */
    }
    throw new Error(code);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`audio too small (${buf.length} bytes)`);
  return buf;
}

async function main() {
  const key = await apiKey();
  if (!key) {
    console.error("Add ELEVENLABS_API_KEY to .env.local, then run npm run voices");
    process.exit(1);
  }
  const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const todo = PERSONAS.filter((p) => !only.length || only.includes(p.id));
  await mkdir(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const persona of todo) {
    let done = false;
    for (const model of MODELS) {
      try {
        const buf = await record(key, persona, model);
        await writeFile(path.join(OUT_DIR, `${persona.id}.mp3`), buf);
        console.log(`${persona.name.padEnd(5)} ${model.padEnd(22)} ${(buf.length / 1024).toFixed(0)} KB  "${persona.greeting}"`);
        done = true;
        break;
      } catch (err) {
        console.warn(`${persona.name.padEnd(5)} ${model.padEnd(22)} failed: ${err.message}`);
      }
    }
    if (!done) failed++;
  }
  if (failed) process.exit(1);
}

main();
