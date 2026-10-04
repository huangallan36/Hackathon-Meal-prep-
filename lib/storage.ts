import { createJSONStorage, type StateStorage } from "zustand/middleware";

/**
 * localStorage that never throws (private mode, quota exceeded, SSR).
 * Persisted stores degrade to in-memory instead of crashing the demo.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return typeof window === "undefined" ? null : window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch (err) {
      console.warn(`[storage] could not save ${name}`, err);
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const persistStorage = createJSONStorage(() => safeLocalStorage);

/** Wipe every persisted Sous store and reload: the "Reset demo" button. */
export function resetDemoData() {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sous:")) window.localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
  window.location.assign("/ai");
}
