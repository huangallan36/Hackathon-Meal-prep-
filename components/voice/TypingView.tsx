"use client";

/**
 * Figma 1.3 "ai chat — typing": the call switched to a light text chat. Header (back to the
 * call, persona orb + name, "Voice paused · typing", Resume voice), the thread, the composer.
 * The iOS keyboard in the design is the system keyboard; it isn't drawn here.
 */
import { useState } from "react";
import { useVoice } from "@/lib/stores/voice";
import { closeTyping, isSttSupported, orbTap, unlockAudio } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";
import { ChatThread } from "./ChatThread";
import { Composer } from "./Composer";

export function TypingView() {
  const persona = usePersona();
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const [sttOk] = useState(isSttSupported);

  const subtitle = status === "speaking" && !paused ? "Speaking..." : status === "thinking" ? "Thinking..." : "Voice paused · typing";

  /** Back to the live call, listening right away (this tap opens the mic). */
  function resumeVoice() {
    unlockAudio();
    useVoice.getState().setTyping(false);
    if (sttOk) orbTap();
  }

  return (
    <div className="flex h-full flex-col bg-cream">
      <header className="flex shrink-0 items-center gap-2.5 px-5 pb-2.5 pt-[calc(var(--safe-top)+4px)]">
        <button
          type="button"
          onClick={closeTyping}
          aria-label="Back to the call"
          title="Back to the call"
          className="relative -ml-1 flex size-[30px] shrink-0 items-center justify-center rounded-full transition after:absolute after:-inset-2 after:content-[''] hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <img src="/figma/screens/2-141/icon-chev-l.svg" alt="" width={22} height={22} className="block size-[22px]" />
        </button>
        <img src={persona.orb} alt="" width={34} height={34} className="block size-[34px] shrink-0" />
        <div className="flex min-w-px flex-1 flex-col gap-px whitespace-nowrap">
          <p className="truncate text-body font-semibold text-ink">{persona.name}</p>
          <p className="truncate text-caption text-ink-soft" aria-live="polite">
            {subtitle}
          </p>
        </div>
        {sttOk && (
          <button
            type="button"
            onClick={resumeVoice}
            className="flex shrink-0 items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-[#d5e6da] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <img src="/figma/screens/2-141/icon-mic.svg" alt="" width={14} height={14} className="block size-[14px]" />
            Resume voice
          </button>
        )}
      </header>
      <div aria-hidden className="h-px shrink-0 bg-line" />

      <ChatThread className="min-h-0 flex-1" />

      <div className="shrink-0 px-3 pb-[calc(var(--safe-bottom)+12px)] pt-2">
        <Composer autoFocus />
      </div>
    </div>
  );
}
