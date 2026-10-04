"use client";

/**
 * Figma 1.3 composer: a 52px white pill with a 1px line, the message field, a mic that
 * dictates into the field (it doesn't send), and a 40px green send button.
 * Sending runs a normal conversation turn (handleUserText), so the reply is spoken too.
 */
import { useEffect, useRef, useState } from "react";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { cancelListening, handleUserText, isSttSupported, stopSpeaking, unlockAudio } from "@/lib/voice/engine";
import { useAssistantName } from "@/lib/voice/persona";
import { abortListening, listenOnce, stopListening } from "@/lib/voice/stt";

function focusWithoutScroll(el: HTMLInputElement | null) {
  try {
    // Not autoFocus: focusing makes the browser scroll the (overflow-hidden) phone frame.
    el?.focus({ preventScroll: true });
  } catch {
    /* ignore */
  }
}

export function Composer({
  className,
  autoFocus = false,
  onBeforeSend,
}: {
  className?: string;
  autoFocus?: boolean;
  /** Runs right before the turn starts (the type sheet closes itself here) */
  onBeforeSend?: () => void;
}) {
  const name = useAssistantName();
  const thinking = useVoice((s) => s.status === "thinking");
  const interim = useVoice((s) => s.interim);
  const [text, setText] = useState("");
  const [dictating, setDictating] = useState(false);
  const [sttOk] = useState(isSttSupported);
  const dictatingRef = useRef(false);

  // Leaving mid-dictation closes the mic.
  useEffect(() => {
    return () => {
      if (dictatingRef.current) abortListening();
    };
  }, []);

  function send(value: string) {
    const message = value.replace(/\s+/g, " ").trim();
    if (!message || thinking) return;
    if (dictatingRef.current) abortListening();
    unlockAudio();
    setText("");
    onBeforeSend?.();
    void handleUserText(message);
  }

  async function dictate() {
    if (dictatingRef.current) {
      // Second tap: done talking, keep what was heard.
      stopListening();
      return;
    }
    unlockAudio();
    // Half-duplex: quiet the assistant and the call's own mic first.
    stopSpeaking();
    cancelListening();
    dictatingRef.current = true;
    setDictating(true);
    const heard = await listenOnce({ quiet: true });
    dictatingRef.current = false;
    setDictating(false);
    if (heard) setText((t) => (t.trim() ? `${t.trim()} ${heard}` : heard));
  }

  const shown = dictating && interim ? `${text.trim() ? `${text.trim()} ` : ""}${interim}` : text;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send(text);
      }}
      className={cn(
        "flex h-[52px] items-center gap-2 rounded-[26px] border border-line bg-surface py-1.5 pl-4 pr-1.5",
        "focus-within:border-accent/60",
        className,
      )}
    >
      <input
        ref={autoFocus ? focusWithoutScroll : undefined}
        value={shown}
        onChange={(e) => setText(e.target.value)}
        readOnly={dictating}
        maxLength={500}
        enterKeyHint="send"
        aria-label={`Message to ${name}`}
        placeholder={dictating ? "Listening..." : `Message ${name}...`}
        className="h-full min-w-px flex-1 bg-transparent text-body text-ink placeholder:text-ink-faint focus:outline-none"
      />
      {sttOk && (
        <button
          type="button"
          onClick={() => void dictate()}
          aria-label={dictating ? "Stop dictating" : "Dictate a message"}
          aria-pressed={dictating}
          className={cn(
            "relative flex size-9 shrink-0 items-center justify-center rounded-full transition active:scale-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            dictating ? "bg-flame-soft" : "hover:bg-cream",
          )}
        >
          {dictating && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-flame/25" />}
          <img src="/figma/screens/2-141/icon-mic-1.svg" alt="" width={20} height={20} className="relative block size-5" />
        </button>
      )}
      <button
        type="submit"
        aria-label="Send"
        disabled={!shown.trim() || thinking || dictating}
        className="flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-accent transition hover:bg-accent-strong active:scale-95 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <img src="/figma/screens/2-141/icon-send.svg" alt="" width={18} height={18} className="block size-[18px]" />
      </button>
    </form>
  );
}
