"use client";

/**
 * Sous's ears: one-shot Web Speech recognition. Exactly one recognizer exists at a time.
 * Interim text streams into useVoice.interim; the promise resolves with the final
 * transcript ("" for silence, cancel or errors). It never rejects.
 */
import { toast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";

/** Stop after this much quiet following the last result */
const SILENCE_MS = 1300;
/** Give up if nothing at all is heard after the mic opens */
const NO_SPEECH_MS = 9000;
/** Absolute cap per utterance (includes the permission prompt) */
const MAX_MS = 30_000;
/** After stop(), wait this long for onend before settling ourselves */
const END_GRACE_MS = 1800;

interface ActiveRecognition {
  rec: SousRecognition;
  settle: (text: string) => void;
  stop: () => void;
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
  active?.stop();
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
  a.settle("");
}

function openTyping(message: string) {
  toast(message, "warning", 3600);
  useVoice.getState().setTyping(true);
}

export function listenOnce(): Promise<string> {
  abortListening();
  const Ctor = recognizerCtor();
  if (!Ctor) {
    openTyping("Voice input isn't available in this browser. You can type instead.");
    return Promise.resolve("");
  }

  return new Promise<string>((resolve) => {
    let rec: SousRecognition;
    try {
      rec = new Ctor();
    } catch {
      openTyping("Voice input isn't available right now. You can type instead.");
      resolve("");
      return;
    }

    let heard = "";
    let failed = false;
    let settled = false;
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const maxTimer = setTimeout(() => stop(), MAX_MS);

    function clearTimers() {
      for (const t of [silenceTimer, noSpeechTimer, graceTimer, maxTimer]) if (t) clearTimeout(t);
    }

    function settle(text: string) {
      if (settled) return;
      settled = true;
      clearTimers();
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      if (active?.rec === rec) active = null;
      useVoice.getState().setInterim("");
      resolve(text.replace(/\s+/g, " ").trim());
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
      noSpeechTimer = setTimeout(stop, NO_SPEECH_MS);
    };

    rec.onresult = (e) => {
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
        case "aborted":
          break;
        case "not-allowed":
        case "service-not-allowed":
          failed = true;
          openTyping("Microphone is blocked. You can type instead.");
          break;
        case "network":
          failed = true;
          openTyping("Voice input needs a connection. You can type instead.");
          break;
        case "audio-capture":
          failed = true;
          openTyping("No microphone found. You can type instead.");
          break;
        default:
          console.warn("[voice] speech recognition error:", e.error);
      }
      // onend normally follows; make sure we settle even if it doesn't.
      if (!graceTimer) graceTimer = setTimeout(() => settle(failed ? "" : heard), END_GRACE_MS);
    };

    rec.onend = () => settle(failed ? "" : heard);

    active = { rec, settle, stop };
    try {
      rec.start();
    } catch (err) {
      console.warn("[voice] could not start recognition:", err instanceof Error ? err.message : err);
      settle("");
    }
  });
}
