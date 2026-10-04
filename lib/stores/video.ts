"use client";

import { create } from "zustand";

/**
 * The recipe video playing inside cooking mode (not persisted). The tutorial card and voice
 * ("show me the video") share it, and hands-free listening waits while it plays so the mic
 * doesn't hear the video.
 */
interface VideoState {
  /** Recipe whose video is open, or null */
  recipeId: number | null;
  show: (recipeId: number) => void;
  hide: () => void;
  toggle: (recipeId: number) => void;
}

export const useVideo = create<VideoState>()((set, get) => ({
  recipeId: null,
  show: (recipeId) => set({ recipeId }),
  hide: () => set({ recipeId: null }),
  toggle: (recipeId) => set({ recipeId: get().recipeId === recipeId ? null : recipeId }),
}));
