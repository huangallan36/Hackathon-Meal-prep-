"use client";

/**
 * Sous's ears: one-shot Web Speech recognition. Exactly one recognizer exists at a time.
 * Interim text streams into useVoice.interim; the promise resolves with the final
 * transcript ("" for silence, cancel or errors). It never rejects.
 */
import { toast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";
import { currentPersona } from "./persona";

/** Stop after this much quiet following the last result */
const SILENCE_MS = 1300;
/** Give up if nothing at all is heard after the mic opens */
const NO_SPEECH_MS = 9000;
/** Absolute cap per utterance (includes the permission prompt) */
const MAX_MS = 30_000;
/** After stop(), wait this long for onend before settling ourselves */
const END_GRACE_MS = 1800;
/**
 * A hands-free (no tap) start that hasn't opened the mic by now was refused: some browsers
 * (iOS Safari) silently ignore start() outside a gesture. Permission was already granted
 * by an earlier tap, so a healthy start takes well under a second.
 */
const AUTO_START_MS = 5000;

/**
 * How a listen ended, so hands-free mode knows whether to listen again:
 *   heard    got a transcript
 *   silence  the mic was open but nobody spoke
 *   stopped  the user closed the mic (a tap on the mascot) before saying anything
 *   aborted  cancelled by the engine (hang up, Sous talking, typing)
 *   blocked  the mic would not open (permission, or no gesture in this browser)
 *   error    the mic or speech service failed (network, no microphone)
 */
export type ListenOutcome = "heard" | "silence" | "stopped" | "aborted" | "blocked" | "error";

export interface ListenResult {
  text: string;
  outcome: ListenOutcome;
}

export interface ListenOptions {
  /**
   * Started by hands-free mode on a timer, not inside a tap. Failures stay quiet (the engine
   * shows its own hint) and a start that never opens the mic counts as "blocked".
   */
  auto?: boolean;
  /**
   * The caller has its own text input (a search field, the chat composer): mic problems are
   * still explained with a toast, but Sous's type-to-talk sheet doesn't open.
   */
  quiet?: boolean;
}

interface ActiveRecognition {
  rec: SousRecognition;
  settle: (text: string, outcome?: ListenOutcome) => void;
  stop: () => void;
  /** The user ended it (a tap on the mascot): an empty result is "stopped", not "silence" */
  markUserStop: () => void;
}

let active: ActiveRecognition | null = null;

function recognizerCtor(): SousRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSttSupported(): boolean {
  return recognizerCtor() !== null;
}

export function isListening(): boolean {
  return active !== null;
}

/** Finish early: close the mic and resolve with what was heard so far. */
export function stopListening(): void {
  const a = active;
  if (!a) return;
  a.markUserStop();
  a.stop();
}

/** Cancel: close the mic and resolve with "". */
export function abortListening(): void {
  const a = active;
  if (!a) return;
  active = null;
  try {
    a.rec.abort();
  } catch {
    /* ignore */
  }
  a.settle("", "aborted");
}

/**
 * Listen once and resolve with the transcript ("" for silence, cancel or errors).
 * By default a mic problem opens the type-to-talk sheet; pass { quiet: true } to only toast.
 */
export function listenOnce(options?: Pick<ListenOptions, "quiet">): Promise<string> {
  return listenOnceDetailed({ quiet: options?.quiet === true }).then((r) => r.text);
}

/** listenOnce with the reason it ended (hands-free mode needs it). Never rejects. */
export function listenOnceDetailed(options?: ListenOptions): Promise<ListenResult> {
  const auto = options?.auto === true;
  const quiet = options?.quiet === true;
  /** A mic problem inside a tap: say what happened and (unless quiet) offer typing instead. */
  const openTyping = (message: string) => {
    toast(message, "warning", 3600);
    if (!quiet) useVoice.getState().setTyping(true);
  };
  abortListening();
  const Ctor = recognizerCtor();
  if (!Ctor) {
    if (!auto) openTyping("Voice input isn't available in this browser. You can type instead.");
    return Promise.resolve({ text: "", outcome: "error" });
  }

  return new Promise<ListenResult>((resolve) => {
    let rec: SousRecognition;
    try {
      rec = new Ctor();
    } catch {
      if (!auto) openTyping("Voice input isn't available right now. You can type instead.");
      resolve({ text: "", outcome: "error" });
      return;
    }

    let heard = "";
    let failed = false;
    /** The mic actually opened (onstart or any result) */
    let started = false;
    let userStopped = false;
    let errorOutcome: ListenOutcome | null = null;
    let settled = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const maxTimer = setTimeout(() => stop(), MAX_MS);
    let startTimer: ReturnType<typeof setTimeout> | null = auto
      ? setTimeout(() => {
          startTimer = null;
          if (started || settled) return;
          try {
            rec.abort();
          } catch {
            /* ignore */
          }
          settle("", "blocked");
        }, AUTO_START_MS)
      : null;

    function clearTimers() {
      for (const t of [silenceTimer, noSpeechTimer, graceTimer, maxTimer, startTimer]) if (t) clearTimeout(t);
    }

    function outcomeFor(text: string): ListenOutcome {
      if (text) return "heard";
      if (errorOutcome) return errorOutcome;
      // A hands-free start that never opened the mic: the browser wants a tap.
      if (auto && !started) return "blocked";
      return userStopped ? "stopped" : "silence";
    }

    function settle(text: string, forced?: ListenOutcome) {
      if (settled) return;
      settled = true;
      clearTimers();
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      if (active?.rec === rec) active = null;
      useVoice.getState().setInterim("");
      const clean = text.replace(/\s+/g, " ").trim();
      resolve({ text: clean, outcome: forced ?? outcomeFor(clean) });
    }

    function stop() {
      if (settled) return;
      try {
        rec.stop();
      } catch {
        settle(failed ? "" : heard);
        return;
      }
      // Some engines never fire onend after stop(); don't hang the turn.
      if (!graceTimer) graceTimer = setTimeout(() => settle(failed ? "" : heard), END_GRACE_MS);
    }

    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      started = true;
      noSpeechTimer = setTimeout(stop, NO_SPEECH_MS);
    };

    rec.onresult = (e) => {
      started = true;
      // Rebuild from every result: event order and isFinal flags vary across browsers.
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        const alt = e.results[i]?.[0];
        if (alt?.transcript) text += `${alt.transcript} `;
      }
      heard = text.replace(/\s+/g, " ").trim();
      if (noSpeechTimer) {
        clearTimeout(noSpeechTimer);
        noSpeechTimer = null;
      }
      useVoice.getState().setInterim(heard);
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(stop, SILENCE_MS);
    };

    rec.onerror = (e) => {
      switch (e.error) {
        case "no-speech":
          break;
        case "aborted":
          // Not ours (ours settle first): something else took the mic.
          errorOutcome = "aborted";
          break;
        case "not-allowed":
        case "service-not-allowed":
          failed = true;
          errorOutcome = "blocked";
          // Hands-free: the mic worked on the last tap, so this is the browser wanting a gesture.
          if (!auto) openTyping("Microphone is blocked. You can type instead.");
          break;
        case "network":
          failed = true;
          errorOutcome = "error";
          if (auto) toast(`Voice input needs a connection. Tap ${currentPersona().name} to try again.`, "warning", 3600);
          else openTyping("Voice input needs a connection. You can type instead.");
          break;
        case "audio-capture":
          failed = true;
          errorOutcome = "error";
          if (auto) toast(`No microphone found. Tap ${currentPersona().name} to try again.`, "warning", 3600);
          else openTyping("No microphone found. You can type instead.");
          break;
        default:
          errorOutcome = "error";
          console.warn("[voice] speech recognition error:", e.error);
      }
      // onend normally follows; make sure we settle even if it doesn't.
      if (!graceTimer) graceTimer = setTimeout(() => settle(failed ? "" : heard), END_GRACE_MS);
    };

    rec.onend = () => settle(failed ? "" : heard);

    active = {
      rec,
      settle,
      stop,
      markUserStop: () => {
        userStopped = true;
      },
    };
    try {
      rec.start();
    } catch (err) {
      console.warn("[voice] could not start recognition:", err instanceof Error ? err.message : err);
      settle("", auto ? "blocked" : "error");
    }
  });
}
