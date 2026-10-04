"use client";

/**
 * Voice engine public API (contract). The voice feature implements these; other
 * features (cooking, fridge, snap) call them. Signatures must not change.
 *
 * STUB: replaced by the real implementation.
 */

/** Call synchronously inside a tap handler (Start button, orb tap) so iOS lets audio play later. */
export function unlockAudio(): void {}

export interface SpeakOptions {
  /** Only speak when a voice session is active (used by buttons so taps don't surprise people) */
  onlyIfSession?: boolean;
  /** Add the line to the transcript (default true) */
  addToTranscript?: boolean;
  source?: "gemini" | "fallback" | "local";
}

/** Speak text with ElevenLabs (browser voice fallback). Resolves when playback ends or is stopped. */
export async function speak(text: string, options?: SpeakOptions): Promise<void> {
  void text;
  void options;
}

export function stopSpeaking(): void {}

/** Begin a conversation (Start button / first orb tap). Does not greet: Sous waits for the user. */
export function startSession(): void {}

/** Hang up: stop mic + audio, clear transcript. */
export function endSession(): void {}

/** Tap-to-talk: listen once, then run a chat turn with the transcript. */
export async function listen(): Promise<void> {}

/** Run a chat turn for typed text (or a transcript). */
export async function handleUserText(text: string): Promise<void> {
  void text;
}

/** Register the router so Gemini's function calls can navigate. Called once by the floating orb. */
export function setNavigator(push: (href: string) => void): void {
  void push;
}
