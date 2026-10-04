"use client";

/**
 * Voice search for the planner's mic button: one listenOnce() turn whose transcript lands in
 * the search box. While it listens, `listening` is true (the "Maya is listening" banner) and
 * `interim` carries the live words. Tapping the mic again finishes early. When voice can't
 * work here (no Web Speech, mic blocked, nothing heard) a toast says so and `onFallback`
 * runs (the screen focuses the search input).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast, useToast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";
import { abortListening, isSttSupported, listenOnce, stopListening } from "@/lib/voice/stt";

export function useVoiceSearch({
  onResult,
  onFallback,
}: {
  onResult: (text: string) => void;
  onFallback: () => void;
}): { listening: boolean; interim: string; toggle: () => void; cancel: () => void } {
  const [listening, setListening] = useState(false);
  const interim = useVoice((s) => s.interim);
  /** Our recognizer is open */
  const live = useRef(false);
  /** The user tapped the mic to finish */
  const finished = useRef(false);
  const handlers = useRef({ onResult, onFallback });
  useEffect(() => {
    handlers.current = { onResult, onFallback };
  });

  // Leaving the screen closes the mic.
  useEffect(
    () => () => {
      if (!live.current) return;
      live.current = false;
      abortListening();
    },
    [],
  );

  const run = useCallback(async () => {
    if (!isSttSupported()) {
      toast("Voice search isn't available in this browser. Type it instead.", "warning");
      handlers.current.onFallback();
      return;
    }
    live.current = true;
    finished.current = false;
    setListening(true);

    // listenOnce() explains mic problems with a toast and opens Sous's type-to-talk sheet.
    // Here the search box is the place to type, so keep that sheet shut and note the toast.
    const typingBefore = useVoice.getState().typing;
    const stopTyping = useVoice.subscribe((s, prev) => {
      if (s.typing && !prev.typing && !typingBefore) useVoice.getState().setTyping(false);
    });
    let toasted = false;
    const stopToasts = useToast.subscribe((s, prev) => {
      if (s.toasts.some((t) => !prev.toasts.includes(t))) toasted = true;
    });

    const text = await listenOnce({ quiet: true });
    stopTyping();
    stopToasts();
    const ours = live.current;
    live.current = false;
    setListening(false);
    if (!ours) return; // cancelled: typing took over, or the screen closed

    if (text) {
      handlers.current.onResult(text);
      return;
    }
    if (!toasted && !finished.current) toast("Didn't catch that. Try again, or type it.");
    handlers.current.onFallback();
  }, []);

  const toggle = useCallback(() => {
    if (live.current) {
      finished.current = true;
      stopListening();
      return;
    }
    void run();
  }, [run]);

  /** Close the mic and drop whatever was heard (e.g. the user started typing) */
  const cancel = useCallback(() => {
    if (!live.current) return;
    live.current = false;
    abortListening();
    setListening(false);
  }, []);

  return { listening, interim: listening ? interim : "", toggle, cancel };
}
