"use client";

/**
 * "Docked" Sous: a product demo of Sous living as a floating bubble over the phone's
 * home screen (like chat heads). A web app can't draw over other apps, so AppShell
 * simulates the home screen inside the phone frame while this is on. The voice session
 * keeps running underneath: the engine doesn't care which screen is showing.
 * Not persisted: a reload always opens the app itself.
 */
import { create } from "zustand";

export type DockSide = "left" | "right";

interface DockState {
  docked: boolean;
  /** Which edge the bubble rests on */
  side: DockSide;
  /** Resting top offset in px inside the phone (null = default spot) */
  y: number | null;
  dock: () => void;
  undock: () => void;
  setBubble: (side: DockSide, y: number) => void;
}

export const useDock = create<DockState>()((set) => ({
  docked: false,
  side: "right",
  y: null,
  dock: () => set({ docked: true }),
  undock: () => set({ docked: false }),
  setBubble: (side, y) => set({ side, y: Number.isFinite(y) ? Math.round(y) : null }),
}));
