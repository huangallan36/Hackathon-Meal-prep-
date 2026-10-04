"use client";

/**
 * Sous's mouth. ElevenLabs audio (via /api/tts) plays on ONE persistent <audio> element
 * that is unlocked inside a tap, so iOS Safari lets later, non-gesture play() calls through.
 * Any failure (bad status, timeout, decode error, autoplay block) falls back to the
 * browser's speechSynthesis. Every playback has a watchdog so nothing can hang "speaking".
 */
import { TIMEOUTS } from "@/lib/config";

export type PlaybackEngine = "elevenlabs" | "browser" | "none";

export interface PlaybackResult {
  engine: PlaybackEngine;
  /** false when stopped early (barge-in, hang up, a newer line) */
  completed: boolean;
}

interface Playback {
  id: number;
  kind: "fetching" | "audio" | "synth";
  paused: boolean;
  abort: AbortController;
  /** Ends this playback early; set by whichever stage is running */
  stop: () => void;
}

let el: HTMLAudioElement | null = null;
let current: Playback | null = null;
let seq = 0;
let unlocked = false;
let synthPrimed = false;

const isBrowser = () => typeof window !== "undefined";

function element(): HTMLAudioElement | null {
  if (!isBrowser()) return null;
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
  }
  return el;
}

/* ------------------------------------------------------------------ */
/* Unlock                                                              */
/* ------------------------------------------------------------------ */

let silentUri: string | null = null;

/** 50 ms of 8-bit mono silence as a WAV data URI, built once. */
function silentWav(): string {
  if (silentUri) return silentUri;
  const sampleRate = 8000;
  const samples = 400;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true); // byte rate
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample
  ascii(36, "data");
  view.setUint32(40, samples, true);
  bytes.fill(128, 44); // 8-bit PCM silence is the midpoint
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  silentUri = `data:audio/wav;base64,${btoa(bin)}`;
  return silentUri;
}

/** Call synchronously inside a tap handler. Safe to call often. */
export function unlockAudio(): void {
  if (!isBrowser()) return;
  primeSynth();
  // Never clobber real playback; once unlocked the element stays unlocked.
  if (unlocked || current?.kind === "audio") return;
  const a = element();
  if (!a) return;
  try {
    a.src = silentWav();
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(
        () => {
          unlocked = true;
        },
        () => {
          /* not a gesture or blocked; the next tap tries again */
        },
      );
    }
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Browser voice                                                       */
/* ------------------------------------------------------------------ */

let voices: SpeechSynthesisVoice[] = [];
let voicesHooked = false;
/** Utterances must stay referenced or Chrome may garbage-collect them mid-sentence. */
const heldUtterances: SpeechSynthesisUtterance[] = [];

function synth(): SpeechSynthesis | null {
  return isBrowser() && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined"
    ? window.speechSynthesis
    : null;
}

function loadVoices() {
  const s = synth();
  if (!s) return;
  const read = () => {
    try {
      const list = s.getVoices();
      if (list.length) voices = list;
    } catch {
      /* ignore */
    }
  };
  read();
  if (!voicesHooked) {
    voicesHooked = true;
    try {
      s.addEventListener("voiceschanged", read);
    } catch {
      s.onvoiceschanged = read;
    }
  }
}

/** iOS only lets speechSynthesis talk after it was used inside a gesture once. */
function primeSynth() {
  const s = synth();
  if (!s) return;
  loadVoices();
  if (synthPrimed) return;
  synthPrimed = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    s.speak(u);
  } catch {
    /* ignore */
  }
}

const NOVELTY =
  /compact|eloquence|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|reed|sandy/;

function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|premium|enhanced/.test(n)) s += 6;
  if (n.includes("google us english")) s += 5;
  if (/samantha|aria|jenny|ava|allison|serena|zoe|karen|daniel|libby|sonia/.test(n)) s += 3;
  if (/en[-_]us/i.test(v.lang)) s += 2;
  if (NOVELTY.test(n)) s -= 10;
  return s;
}

function pickVoice(): SpeechSynthesisVoice | null {
  loadVoices();
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!english.length) return null;
  return [...english].sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

/** Sentence-sized chunks: avoids Chrome's ~15s utterance cutoff and keeps pause/resume snappy. */
function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? [text];
  const out: string[] = [];
  for (const piece of raw.map((p) => p.trim()).filter(Boolean)) {
    if (piece.length <= 220) {
      // Merge very short fragments ("Okay.") into the previous chunk
      if (out.length && out[out.length - 1].length + piece.length < 60) out[out.length - 1] += ` ${piece}`;
      else out.push(piece);
      continue;
    }
    let rest = piece;
    while (rest.length > 220) {
      const cut = Math.max(rest.lastIndexOf(", ", 200), rest.lastIndexOf("; ", 200), rest.lastIndexOf(" ", 200));
      const at = cut > 40 ? cut + 1 : 200;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out.length ? out : [text];
}

type StageResult = "ended" | "stopped" | "failed";

function speakWithBrowser(text: string, pb: Playback): Promise<StageResult> {
  const s = synth();
  if (!s) return Promise.resolve("failed");
  return new Promise((resolve) => {
    const parts = splitSentences(text);
    const voice = pickVoice();
    let done = false;
    let lastKick = Date.now();
    let limit = 6000;
    let startTimer: ReturnType<typeof setTimeout> | null = null;

    const watch = setInterval(() => {
      if (pb.paused) {
        lastKick = Date.now();
        return;
      }
      if (Date.now() - lastKick > limit) {
        try {
          s.cancel();
        } catch {
          /* ignore */
        }
        finish("ended");
      }
    }, 500);

    function finish(r: StageResult) {
      if (done) return;
      done = true;
      clearInterval(watch);
      if (startTimer) clearTimeout(startTimer);
      heldUtterances.length = 0;
      resolve(r);
    }

    pb.kind = "synth";
    pb.stop = () => {
      try {
        s.cancel();
      } catch {
        /* ignore */
      }
      finish("stopped");
    };

    try {
      s.cancel();
    } catch {
      /* ignore */
    }

    const utterances = parts.map((part, i) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = "en-US";
      if (voice) u.voice = voice;
      u.rate = 1.02;
      u.pitch = 1;
      u.onstart = () => {
        lastKick = Date.now();
        limit = 4000 + part.length * 110;
      };
      u.onend = () => {
        lastKick = Date.now();
        limit = 5000;
        if (i === parts.length - 1) finish("ended");
      };
      u.onerror = (e) => {
        if (e.error === "interrupted" || e.error === "canceled") return; // our own cancel()
        if (i === parts.length - 1 || e.error === "not-allowed") finish("ended");
      };
      return u;
    });
    heldUtterances.splice(0, heldUtterances.length, ...utterances);

    // Chrome sometimes drops a speak() issued in the same tick as cancel()
    startTimer = setTimeout(() => {
      startTimer = null;
      if (done) return;
      try {
        for (const u of utterances) s.speak(u);
        if (pb.paused) s.pause();
      } catch {
        finish("failed");
      }
    }, 60);
  });
}

/* ------------------------------------------------------------------ */
/* ElevenLabs                                                          */
/* ------------------------------------------------------------------ */

/** Small LRU so "repeat that" and common lines don't cost another TTS call */
const blobCache = new Map<string, Blob>();
const CACHE_MAX = 16;
/** The route caps speech at ~800 chars on a sentence boundary; this only bounds the request body. */
const TTS_MAX_CHARS = 2000;
/** Once audio starts streaming, allow this long for the rest of the bytes */
const TTS_BODY_MS = 15_000;

async function fetchTts(text: string, voiceId: string | null | undefined, signal: AbortSignal): Promise<Blob> {
  const key = `${voiceId ?? ""}|${text}`;
  const hit = blobCache.get(key);
  if (hit) {
    blobCache.delete(key);
    blobCache.set(key, hit);
    return hit;
  }
  const controller = new AbortController();
  // First byte within TIMEOUTS.tts, then a separate budget for the streamed body.
  let timer = setTimeout(() => controller.abort(), TIMEOUTS.tts);
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, TTS_MAX_CHARS), ...(voiceId ? { voiceId } : {}) }),
      signal: controller.signal,
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !(type.startsWith("audio/") || type.startsWith("application/octet-stream"))) {
      throw new Error(`tts status ${res.status}`);
    }
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), TTS_BODY_MS);
    const blob = await res.blob();
    if (blob.size < 256) throw new Error("tts returned empty audio");
    blobCache.set(key, blob);
    if (blobCache.size > CACHE_MAX) {
      const oldest = blobCache.keys().next().value;
      if (oldest !== undefined) blobCache.delete(oldest);
    }
    return blob;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

function playBlob(blob: Blob, pb: Playback): Promise<StageResult> {
  const node = element();
  if (!node) return Promise.resolve("failed");
  const a: HTMLAudioElement = node;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    let done = false;
    let started = false;
    let lastProgress = Date.now();

    const onProgress = () => {
      started = true;
      lastProgress = Date.now();
    };
    const onEnded = () => finish("ended");
    // An error after audio started means we already said most of it: don't repeat it in another voice.
    const onError = () => finish(started ? "ended" : "failed");

    const watch = setInterval(() => {
      if (pb.paused) {
        lastProgress = Date.now();
        return;
      }
      if (Date.now() - lastProgress > (started ? 6000 : 8000)) finish(started ? "ended" : "failed");
    }, 500);

    function finish(r: StageResult) {
      if (done) return;
      done = true;
      clearInterval(watch);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      a.removeEventListener("timeupdate", onProgress);
      a.removeEventListener("playing", onProgress);
      if (r !== "ended") {
        try {
          a.pause();
        } catch {
          /* ignore */
        }
      }
      URL.revokeObjectURL(url);
      resolve(r);
    }

    pb.kind = "audio";
    pb.stop = () => finish("stopped");

    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    a.addEventListener("timeupdate", onProgress);
    a.addEventListener("playing", onProgress);
    try {
      a.src = url;
      if (!pb.paused) {
        a.play().catch(() => {
          // NotAllowedError (no unlock), NotSupportedError (decode), or AbortError (we stopped)
          if (!done) finish(started ? "ended" : "failed");
        });
      }
    } catch {
      finish("failed");
    }
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const isCurrent = (pb: Playback) => current === pb;

/**
 * Speak `text` (already normalized for TTS). Resolves when playback ends, is stopped,
 * or fails over completely. Never rejects.
 */
export async function playTts(text: string, voiceId?: string | null): Promise<PlaybackResult> {
  stopPlayback();
  const clean = text.trim();
  if (!clean || !isBrowser()) return { engine: "none", completed: true };

  const pb: Playback = { id: ++seq, kind: "fetching", paused: false, abort: new AbortController(), stop: () => {} };
  current = pb;
  const stopped = (engine: PlaybackEngine): PlaybackResult => ({ engine, completed: false });

  try {
    let blob: Blob | null = null;
    try {
      blob = await fetchTts(clean, voiceId, pb.abort.signal);
    } catch (err) {
      if (!isCurrent(pb)) return stopped("none");
      console.warn("[voice] ElevenLabs unavailable, using browser voice:", err instanceof Error ? err.message : err);
    }
    if (!isCurrent(pb)) return stopped("none");

    if (blob) {
      const r = await playBlob(blob, pb);
      if (r === "ended") return { engine: "elevenlabs", completed: true };
      if (r === "stopped" || !isCurrent(pb)) return stopped("elevenlabs");
      console.warn("[voice] audio playback failed, using browser voice");
    }

    const r = await speakWithBrowser(clean, pb);
    if (r === "stopped" || !isCurrent(pb)) return stopped("browser");
    return { engine: r === "failed" ? "none" : "browser", completed: true };
  } catch (err) {
    console.warn("[voice] playback error:", err instanceof Error ? err.message : err);
    return { engine: "none", completed: false };
  } finally {
    if (isCurrent(pb)) current = null;
  }
}

/** Stop whatever is playing or loading. The pending playTts promise resolves. */
export function stopPlayback(): void {
  seq++;
  const pb = current;
  current = null;
  if (!pb) return;
  pb.abort.abort();
  try {
    pb.stop();
  } catch {
    /* ignore */
  }
  if (pb.kind === "synth") {
    try {
      synth()?.cancel();
    } catch {
      /* ignore */
    }
  }
}

export function pausePlayback(): void {
  const pb = current;
  if (!pb || pb.paused) return;
  pb.paused = true;
  try {
    if (pb.kind === "audio") element()?.pause();
    else if (pb.kind === "synth") synth()?.pause();
  } catch {
    /* ignore */
  }
}

export function resumePlayback(): void {
  const pb = current;
  if (!pb || !pb.paused) return;
  pb.paused = false;
  try {
    if (pb.kind === "audio") {
      element()
        ?.play()
        .catch(() => {
          if (current === pb) stopPlayback();
        });
    } else if (pb.kind === "synth") {
      synth()?.resume();
    }
  } catch {
    /* ignore */
  }
}

export function isPlaying(): boolean {
  return current !== null;
}
