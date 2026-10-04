"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared 500 ms clock for every countdown on screen. It only ticks while something
 * subscribes, and components read it through useSyncExternalStore, so rendering stays pure.
 */
const TICK_MS = 500;
let now = Date.now();
let interval: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!interval) {
    now = Date.now();
    interval = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && interval) {
      clearInterval(interval);
      interval = null;
    }
  };
}

const noopSubscribe = () => () => {};
const getSnapshot = () => now;
const getServerSnapshot = () => 0;

/** Current epoch ms, refreshed every 500 ms while `active` */
export function useNow(active = true): number {
  return useSyncExternalStore(active ? subscribe : noopSubscribe, getSnapshot, getServerSnapshot);
}
