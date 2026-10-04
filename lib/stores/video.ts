"use client";

import { create } from "zustand";

/**
 * The recipe video inside cooking mode (not persisted). The tutorial card and voice ("show me
 * the video") share it. `playing` comes from the YouTube player itself: hands-free listening
 * waits only while the video is actually playing, so the mic doesn't hear it.
 */
interface VideoState {
  /** Recipe whose video is open, or null */
  recipeId: number | null;
  /** Step (0-based) it was opened on: that step's card autoplays; other steps' cards cue it paused */
  step: number | null;
  playing: boolean;
  show: (recipeId: number, step?: number | null) => void;
  hide: () => void;
  setPlaying: (playing: boolean) => void;
}

export const useVideo = create<VideoState>()((set) => ({
  recipeId: null,
  step: null,
  playing: false,
  show: (recipeId, step = null) => set({ recipeId, step }),
  hide: () => set({ recipeId: null, step: null, playing: false }),
  setPlaying: (playing) => set({ playing }),
}));
