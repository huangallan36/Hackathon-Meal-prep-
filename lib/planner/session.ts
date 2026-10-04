"use client";

/**
 * In-memory (not persisted) planner screen state, so "Cook this" -> back returns to the
 * same search and filters. A reload starts fresh, which is what you want in a demo.
 */
import { create } from "zustand";
import type { SearchFilters } from "./search";

interface PlannerSessionState {
  query: string;
  filters: SearchFilters;
  remember: (patch: Partial<Pick<PlannerSessionState, "query" | "filters">>) => void;
}

export const usePlannerSession = create<PlannerSessionState>()((set) => ({
  query: "",
  filters: {},
  remember: (patch) => set(patch),
}));
