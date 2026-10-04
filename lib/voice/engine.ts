"use client";

/**
 * Voice engine public API (contract). Other features (cooking, fridge, snap) call these;
 * the exported signatures of the original contract must not change.
 *
 * State machine (useVoice.status): idle -> listening -> thinking -> speaking -> idle.
 * Half-duplex: the mic is never open while Sous's audio plays. A turn counter makes sure
 * a slow, stale response never speaks after a hang up or a newer turn.
 */
import { TIMEOUTS } from "@/lib/config";
import { postJSON } from "@/lib/http";
import { fallbackReply, quickCookingIntent } from "@/lib/intents";
import { useKitchen } from "@/lib/stores/kitchen";
import { usePrefs } from "@/lib/stores/prefs";
import { toast } from "@/lib/stores/toast";
import { useVoice, type TranscriptLine } from "@/lib/stores/voice";
import type { ChatContext, ChatRequest, ChatResponse, ChatTurn, SousAction } from "@/lib/types";
import { applyActions } from "./actions";
import { isPlaying, pausePlayback, playTts, resumePlayback, stopPlayback, unlockAudio as unlockAudioElement } from "./audio";
import { buildChatContext, getCurrentPath, setRouterPush } from "./context";
import { toDisplay, toSpeech } from "./speech-text";
import { abortListening, isSttSupported, listenOnce, stopListening } from "./stt";

export { isSttSupported } from "./stt";

/** Bumps on every new turn and on every cancel (hang up, barge-in). */
let turnSeq = 0;
/** Bumps on every speak() / stopSpeaking(), so only the latest line resets the status. */
let speechSeq = 0;
/**
 * The turn currently waiting on /api/chat (0 = none). A screen line that plays meanwhile
 * hands the status back to "thinking" when it ends, so the orb never looks free mid-turn.
 */
let awaitingTurn = 0;
/** A line that arrived while paused: shown right away, spoken on Resume. */
let heldLine: string | null = null;

/** Last line spoken, to drop an identical speak() that arrives while it is still playing */
let lastLine = { text: "", at: 0 };
const DUPLICATE_MS = 2500;

const HISTORY_TURNS = 12;
const MAX_MESSAGE_CHARS = 500;
const SORRY_LINE = "Sorry, I didn't catch that. Try saying: scan my fridge.";

const voice = () => useVoice.getState();

/** Status to fall back to once Sous stops talking. */
function restingStatus(): "thinking" | "idle" {
  return awaitingTurn !== 0 && awaitingTurn === turnSeq ? "thinking" : "idle";
}

/* ------------------------------------------------------------------ */
/* Audio                                                               */
/* ------------------------------------------------------------------ */

/** Call synchronously inside a tap handler (Start button, orb tap) so iOS lets audio play later. */
export function unlockAudio(): void {
  unlockAudioElement();
}

export interface SpeakOptions {
  /** Only speak when a voice session is active (used by buttons so taps don't surprise people) */
  onlyIfSession?: boolean;
  /** Add the line to the transcript (default true) */
  addToTranscript?: boolean;
  source?: "gemini" | "fallback" | "local";
}

/** Speak text with ElevenLabs (browser voice fallback). Resolves when playback ends or is stopped. */
export async function speak(text: string, options?: SpeakOptions): Promise<void> {
  const opts = options ?? {};
  if (opts.onlyIfSession && !voice().sessionActive) return;
  let display = "";
  try {
    display = toDisplay(typeof text === "string" ? text : "");
  } catch {
    display = typeof text === "string" ? text.trim() : "";
  }
  if (!display) return;

  // A screen and the voice fast path may both voice the same step: don't restart it mid-sentence.
  const now = Date.now();
  if (display === lastLine.text && now - lastLine.at < DUPLICATE_MS && voice().status === "speaking") return;
  lastLine = { text: display, at: now };

  try {
    const v = voice();
    // Half-duplex: close the mic before Sous talks.
    if (v.status === "listening") {
      turnSeq++;
      abortListening();
      v.setStatus(restingStatus());
    }
    if (opts.addToTranscript === false) v.setCaption(display);
    else v.addLine("sous", display, opts.source);
  } catch (err) {
    console.warn("[voice] could not show line:", err instanceof Error ? err.message : err);
  }
  await voiceLine(display);
}

/** Play an already-displayed line and keep useVoice.status honest while it plays. Never rejects. */
async function voiceLine(display: string): Promise<void> {
  const id = ++speechSeq;
  try {
    // Paused: the line is on screen; hold it for Resume instead of talking.
    if (voice().paused) {
      stopPlayback();
      heldLine = display;
      if (voice().status === "speaking") voice().setStatus(restingStatus());
      return;
    }
    heldLine = null;
    voice().setStatus("speaking");
    await playTts(toSpeech(display), usePrefs.getState().voiceId, (engine) => {
      if (id === speechSeq) voice().setTtsEngine(engine);
    });
  } catch (err) {
    console.warn("[voice] speak failed:", err instanceof Error ? err.message : err);
  } finally {
    if (id === speechSeq && voice().status === "speaking") voice().setStatus(restingStatus());
  }
}

export function stopSpeaking(): void {
  speechSeq++;
  heldLine = null;
  stopPlayback();
  if (voice().status === "speaking") voice().setStatus(restingStatus());
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

/** Begin a conversation (Start button / first orb tap). Does not greet: Sous waits for the user. */
export function startSession(): void {
  voice().startSession();
}

/** Hang up: stop mic + audio, clear transcript. */
export function endSession(): void {
  turnSeq++;
  speechSeq++;
  awaitingTurn = 0;
  heldLine = null;
  lastLine = { text: "", at: 0 };
  abortListening();
  stopPlayback();
  voice().endSession();
}

/** Pause Sous: audio pauses where it is and the mic closes. */
export function pauseSession(): void {
  const v = voice();
  if (v.paused) return;
  if (v.status === "listening") {
    turnSeq++;
    abortListening();
    v.setStatus("idle");
  }
  pausePlayback();
  v.setPaused(true);
}

export function resumeSession(): void {
  if (!voice().paused) return;
  voice().setPaused(false);
  const held = heldLine;
  heldLine = null;
  // A reply that arrived while paused is said now; otherwise pick up where the audio stopped.
  if (held && !isPlaying() && voice().status !== "listening") void voiceLine(held);
  else resumePlayback();
}

export function togglePause(): void {
  if (voice().paused) resumeSession();
  else pauseSession();
}

/* ------------------------------------------------------------------ */
/* Listening                                                           */
/* ------------------------------------------------------------------ */

/** Tap-to-talk: listen once, then run a chat turn with the transcript. */
export async function listen(): Promise<void> {
  try {
    const v = voice();
    if (v.status === "thinking" || v.status === "listening") return;
    if (!v.sessionActive) v.startSession();
    if (v.paused) v.setPaused(false);
    // Talking again drops anything held from a pause: the user has moved on.
    heldLine = null;
    if (v.status === "speaking" || isPlaying()) stopSpeaking();
    if (!isSttSupported()) {
      v.setTyping(true);
      return;
    }

    const id = ++turnSeq;
    v.setError(null);
    v.setInterim("");
    v.setStatus("listening");
    const transcript = await listenOnce();
    if (id !== turnSeq) return; // hung up, paused, or interrupted meanwhile

    if (!transcript) {
      if (voice().status === "listening") voice().setStatus("idle");
      return;
    }
    await runTurn(transcript, ++turnSeq);
  } catch (err) {
    console.warn("[voice] listen failed:", err instanceof Error ? err.message : err);
    if (voice().status === "listening") voice().setStatus("idle");
  }
}

/** Finish listening early (orb tapped while listening); the turn continues with what was heard. */
export function finishListening(): void {
  stopListening();
}

/** Close the mic and drop whatever was heard (e.g. switching to typing). */
export function cancelListening(): void {
  if (voice().status !== "listening") return;
  turnSeq++;
  abortListening();
  voice().setStatus("idle");
}

/** Open the text input; the mic closes so it can't pick up a half sentence meanwhile. */
export function openTyping(): void {
  cancelListening();
  voice().setTyping(true);
}

/**
 * The orb's tap behavior, shared by the floating orb and the conversation screen.
 * Call it directly from the tap handler (it unlocks audio and starts the mic synchronously).
 */
export function orbTap(): void {
  unlockAudio();
  const v = voice();
  if (!v.sessionActive) startSession();
  if (!isSttSupported()) {
    if (v.status === "speaking") stopSpeaking();
    v.setTyping(true);
    return;
  }
  if (v.status === "thinking") return;
  if (v.status === "listening") {
    finishListening();
    return;
  }
  // listen() stops Sous first (barge-in) and opens the mic inside this tap.
  void listen();
}

/* ------------------------------------------------------------------ */
/* Turns                                                               */
/* ------------------------------------------------------------------ */

/** Run a chat turn for typed text (or a transcript). */
export async function handleUserText(text: string): Promise<void> {
  try {
    const clean = (typeof text === "string" ? text : "").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!clean) return;
    const v = voice();
    if (v.status === "thinking") {
      toast("One sec, Sous is still thinking.");
      return;
    }
    if (!v.sessionActive) v.startSession();
    if (v.paused) v.setPaused(false);
    if (v.status === "listening") {
      turnSeq++;
      abortListening();
    }
    if (v.status === "speaking" || isPlaying()) stopSpeaking();
    heldLine = null;
    await runTurn(clean, ++turnSeq);
  } catch (err) {
    console.warn("[voice] turn failed:", err instanceof Error ? err.message : err);
  }
}

function toHistory(lines: TranscriptLine[]): ChatTurn[] {
  return lines.slice(-HISTORY_TURNS).map((l) => ({ role: l.role, text: l.text.slice(0, MAX_MESSAGE_CHARS) }));
}

/**
 * "next" / "repeat" / "go back" skip the network when they clearly mean the recipe: on its
 * cook screen, or anywhere once its steps have started. A recipe left on the overview (or a
 * stale one from an earlier session) goes through Gemini instead, so a stray "okay" or
 * "what?" on another screen doesn't yank the user into cooking mode.
 */
function quickPathOn(): boolean {
  const k = useKitchen.getState();
  const r = k.activeRecipe;
  if (!r || !r.steps.length) return false;
  if (getCurrentPath() === `/ai/cook/${r.id}`) return true;
  return k.finishedRecipeId !== r.id && k.stepIndex >= 0;
}

function safeQuickIntent(text: string): SousAction["name"] | null {
  try {
    return quickCookingIntent(text);
  } catch {
    return null;
  }
}

function offlineReply(message: string, context: ChatContext): ChatResponse {
  try {
    const r = fallbackReply(message, context);
    if (r && typeof r.reply === "string" && r.reply.trim()) {
      return { reply: r.reply, actions: Array.isArray(r.actions) ? r.actions : [], source: "fallback" };
    }
  } catch (err) {
    console.warn("[voice] fallbackReply failed:", err instanceof Error ? err.message : err);
  }
  return { reply: SORRY_LINE, actions: [], source: "fallback" };
}

/** POST /api/chat with a hard timeout. Never throws: falls back to the local intent router. */
async function askSous(req: ChatRequest): Promise<ChatResponse> {
  try {
    const res = await postJSON<ChatResponse>("/api/chat", req, { timeoutMs: TIMEOUTS.chat });
    const actions = Array.isArray(res?.actions) ? res.actions : [];
    const reply = typeof res?.reply === "string" ? res.reply.trim() : "";
    if (!reply && !actions.length) throw new Error("empty chat response");
    return { reply: reply || "On it.", actions, source: res.source === "gemini" ? "gemini" : "fallback" };
  } catch (err) {
    console.warn("[voice] chat unavailable, answering offline:", err instanceof Error ? err.message : err);
    return offlineReply(req.message, req.context);
  }
}

async function runTurn(text: string, id: number): Promise<void> {
  const history = toHistory(voice().transcript);
  voice().setInterim("");
  voice().addLine("user", text);
  try {
    // Fast path: "next", "repeat", "go back" while cooking need no network at all.
    if (quickPathOn()) {
      const quick = safeQuickIntent(text);
      if (quick) {
        const line = await applyActions([{ name: quick }]);
        if (id !== turnSeq) return;
        await speak(line ?? "Okay.", { source: "local" });
        return;
      }
    }

    voice().setStatus("thinking");
    awaitingTurn = id;
    const context = buildChatContext();
    const res = await askSous({ message: text, history, context });
    if (id !== turnSeq) return;
    // Actions can navigate or load a recipe; the orb keeps "thinking" until Sous answers.
    const override = await applyActions(res.actions);
    if (id !== turnSeq) return;
    awaitingTurn = 0;
    await speak(override ?? res.reply, { source: res.source });
  } catch (err) {
    console.warn("[voice] turn failed:", err instanceof Error ? err.message : err);
    if (id === turnSeq) {
      awaitingTurn = 0;
      await speak("Sorry, something went wrong on my end. Try that again?", { source: "fallback" });
    }
  } finally {
    if (awaitingTurn === id) awaitingTurn = 0;
    if (id === turnSeq && voice().status === "thinking") voice().setStatus("idle");
  }
}

/** Register the router so Gemini's function calls can navigate. Called once by the floating orb. */
export function setNavigator(push: (href: string) => void): void {
  setRouterPush(push);
}
