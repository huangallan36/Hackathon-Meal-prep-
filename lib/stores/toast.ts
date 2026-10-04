"use client";

import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ToastTone = "default" | "success" | "warning";

interface Toast {
  id: string;
  text: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  show: (text: string, tone?: ToastTone, ms?: number) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastState>()((set, get) => ({
  toasts: [],
  show: (text, tone = "default", ms = 2600) => {
    const id = uid("toast");
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience for non-React code (voice engine, action dispatcher) */
export const toast = (text: string, tone?: ToastTone, ms?: number) => useToast.getState().show(text, tone, ms);
