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
  setVoice: (id: string, name: string) => void;
  setUserName: (name: string) => void;
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      userName: DEMO_USER.name,
      voiceId: null,
      voiceName: null,
      setVoice: (voiceId, voiceName) => set({ voiceId, voiceName }),
      setUserName: (userName) => set({ userName }),
    }),
    { name: storageKey("prefs"), storage: persistStorage },
  ),
);
