"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_USER, storageKey } from "@/lib/config";
import { persistStorage } from "@/lib/storage";

interface PrefsState {
  userName: string;
  /** ElevenLabs voice id chosen in the voice picker (null = server default) */
  voiceId: string | null;
  voiceName: string | null;
  /**
   * Conversation mode: Sous opens the mic again by itself after it talks, so no tap is
   * needed between turns. Toggle it through the voice engine's setHandsFreeMode(), which
   * also starts or stops the listening loop.
   */
  handsFree: boolean;
  setVoice: (id: string, name: string) => void;
  setUserName: (name: string) => void;
  setHandsFree: (on: boolean) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      userName: DEMO_USER.name,
      voiceId: null,
      voiceName: null,
      handsFree: false,
      setVoice: (voiceId, voiceName) => set({ voiceId, voiceName }),
      setUserName: (userName) => set({ userName }),
      setHandsFree: (handsFree) => set({ handsFree: handsFree === true }),
    }),
    { name: storageKey("prefs"), storage: persistStorage },
  ),
);
