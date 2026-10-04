"use client";

import { create } from "zustand";

/** The in-app store map (a sheet over any screen): opened by the grocery "Map" link or by voice. */
interface MapState {
  /** Index into NEARBY_STORES, or null when closed */
  store: number | null;
  open: (store: number) => void;
  close: () => void;
}

export const useMapView = create<MapState>()((set) => ({
  store: null,
  open: (store) => set({ store }),
  close: () => set({ store: null }),
}));
