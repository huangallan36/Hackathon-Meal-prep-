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
  /** The recipe this Sous line suggested or opened (drives the inline recipe card in the chat) */
  recipeId?: number;
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
  /** epoch ms the current session started (the call timer), null when no session */
  sessionStartedAt: number | null;
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
  /** "Stop listening": the mic stays open but only answers to "start listening" (or a tap) */
  asleep: boolean;

  setStatus: (status: VoiceStatus) => void;
  setInterim: (interim: string) => void;
  setPaused: (paused: boolean) => void;
  setTyping: (typing: boolean) => void;
  setError: (error: string | null) => void;
  setCaption: (caption: string | null) => void;
  setTtsEngine: (engine: TtsEngine | null) => void;
  setHandsFreeRest: (rest: HandsFreeRest | null) => void;
  setAsleep: (asleep: boolean) => void;
  addLine: (
    role: TranscriptLine["role"],
    text: string,
    source?: TranscriptLine["source"],
    extra?: Pick<TranscriptLine, "recipeId">,
  ) => void;
  startSession: () => void;
  endSession: () => void;
}

export const useVoice = create<VoiceState>()((set) => ({
  sessionActive: false,
  sessionStartedAt: null,
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
  asleep: false,

  setStatus: (status) => set({ status }),
  setInterim: (interim) => set({ interim }),
  setPaused: (paused) => set({ paused }),
  setTyping: (typing) => set({ typing }),
  setError: (error) => set({ error }),
  setCaption: (caption) => set({ caption, captionAt: Date.now() }),
  setTtsEngine: (ttsEngine) => set({ ttsEngine }),
  setHandsFreeRest: (handsFreeRest) => set({ handsFreeRest, handsFreeRestAt: handsFreeRest ? Date.now() : 0 }),
  setAsleep: (asleep) => set({ asleep }),
  addLine: (role, text, source, extra) =>
    set((s) => ({
      transcript: [
        ...s.transcript,
        { id: uid("t"), role, text, at: Date.now(), source, ...(extra?.recipeId ? { recipeId: extra.recipeId } : {}) },
      ].slice(-60),
      ...(role === "sous" ? { caption: text, captionAt: Date.now() } : {}),
    })),
  startSession: () =>
    set((s) => ({
      sessionActive: true,
      // Starting again mid-session (another tap) keeps the call timer running.
      sessionStartedAt: s.sessionActive && s.sessionStartedAt ? s.sessionStartedAt : Date.now(),
      paused: false,
      error: null,
    })),
  endSession: () =>
    set({
      asleep: false,
      sessionActive: false,
      sessionStartedAt: null,
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
