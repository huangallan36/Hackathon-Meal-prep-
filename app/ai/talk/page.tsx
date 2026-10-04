"use client";

/**
 * The live call with the chosen persona. Two faces of one session:
 *   talking (Figma 5.1–5.4, 5.6 dark) the call screen: mascot on its rings, live transcript,
 *           call controls; white or black with the phone's theme
 *   typing  (Figma 1.3) the light text chat, opened with Type, closed with Back to voice / back
 * Typing is useVoice.typing, so the engine's own fallbacks (no speech recognition, mic
 * blocked) land in the chat view too.
 */
import { useEffect } from "react";
import { TalkingView } from "@/components/voice/TalkingView";
import { TypingView } from "@/components/voice/TypingView";
import { useVoice } from "@/lib/stores/voice";
import { isSttSupported, startSession } from "@/lib/voice/engine";

export default function TalkPage() {
  const typing = useVoice((s) => s.typing);

  useEffect(() => {
    const v = useVoice.getState();
    if (!v.sessionActive) startSession();
    if (!isSttSupported()) v.setTyping(true);
  }, []);

  return <div className="relative h-full overflow-hidden">{typing ? <TypingView /> : <TalkingView />}</div>;
}
