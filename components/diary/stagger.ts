import type { CSSProperties } from "react";

/** Inline delay for `animate-fade-up` so cards cascade in */
export function stagger(index: number, stepMs = 70): CSSProperties {
  return { animationDelay: `${index * stepMs}ms` };
}
