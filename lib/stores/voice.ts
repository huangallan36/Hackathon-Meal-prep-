"use client";

/**
 * Conversation state. Owned by the voice feature (lib/voice/*); everything else
 * only reads it (e.g. the floating orb's status) or calls the engine in lib/voice.
 * Not persisted: a reload starts a fresh conversation.
 */
import { create } from "zustand";
import type { ChatTurn, VoiceStatus } from "@/lib/types";
import { uid } from "@/lib/utils";

export interface TranscriptLine {
  id: string;
  role: ChatTurn["role"];
  text: string;
  at: number;
  /** Where Sous's line came from (for a subtle "offline mode" hint) */
  source?: "gemini" | "fallback" | "local";
}

/** Which engine actually voiced the last Sous line */
export type TtsEngine = "elevenlabs" | "browser" | "none";

/**
 * Why hands-free mode stopped opening the mic by itself (null = the loop is live):
 *   silence  several listens in a row heard nothing ("Still there?")
 *   stopped  the user closed the mic without saying anything
 *   blocked  the browser won't start the mic without a tap (e.g. iOS Safari)
 *   error    the mic or speech service failed
 * The next orb tap wakes it (except "blocked", which only re-enabling the toggle retries).
 */
export type HandsFreeRest = "silence" | "stopped" | "blocked" | "error";

interface VoiceState {
  /** True between Start and Hang up */
  sessionActive: boolean;
  status: VoiceStatus;
  /** User paused Sous (audio paused, mic off) */
  paused: boolean;
  /** Text-input fallback open */
  typing: boolean;
  transcript: TranscriptLine[];
  /** Live partial speech-to-text */
  interim: string;
  /** Latest Sous line, shown as a caption by the floating orb */
  caption: string | null;
  /** epoch ms the caption last changed (lets the bubble re-show identical text) */
  captionAt: number;
  ttsEngine: TtsEngine | null;
  error: string | null;
  /** Hands-free loop resting (see HandsFreeRest); null while it is live or off */
  handsFreeRest: HandsFreeRest | null;
  /** epoch ms handsFreeRest last changed (lets hints fade like captions) */
  handsFreeRestAt: number;

  setStatus: (status: VoiceStatus) => void;
  setInterim: (interim: string) => void;
  setPaused: (paused: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  setCaption: (caption: string | null) => void;
  setTtsEngine: (engine: TtsEngine | null) => void;
  setHandsFreeRest: (rest: HandsFreeRest | null) => void;
  addLine: (role: TranscriptLine["role"], text: string, source?: TranscriptLine["source"]) => void;
  startSession: () => void;
  endSession: () => void;
}

export const useVoice = create<VoiceState>()((set) => ({
  sessionActive: false,
  status: "idle",
  paused: false,
  typing: false,
  transcript: [],
  interim: "",
  caption: null,
  captionAt: 0,
  ttsEngine: null,
  error: null,
  handsFreeRest: null,
  handsFreeRestAt: 0,

  setStatus: (status) => set({ status }),
  setInterim: (interim) => set({ interim }),
  setPaused: (paused) => set({ paused }),
  setTyping: (typing) => set({ typing }),
  setError: (error) => set({ error }),
  setCaption: (caption) => set({ caption, captionAt: Date.now() }),
  setTtsEngine: (ttsEngine) => set({ ttsEngine }),
  setHandsFreeRest: (handsFreeRest) => set({ handsFreeRest, handsFreeRestAt: handsFreeRest ? Date.now() : 0 }),
  addLine: (role, text, source) =>
    set((s) => ({
      transcript: [...s.transcript, { id: uid("t"), role, text, at: Date.now(), source }].slice(-60),
      ...(role === "sous" ? { caption: text, captionAt: Date.now() } : {}),
    })),
  startSession: () => set({ sessionActive: true, paused: false, error: null }),
  endSession: () =>
    set({
      sessionActive: false,
      status: "idle",
      paused: false,
      typing: false,
      interim: "",
      caption: null,
      captionAt: 0,
      transcript: [],
      error: null,
      handsFreeRest: null,
      handsFreeRestAt: 0,
    }),
}));
