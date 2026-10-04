"use client";

/**
 * The three sous-chef personas from the Figma home screen ("Pick your sous-chef").
 * Each maps to an ElevenLabs premade voice; the assistant speaks and is labelled as the
 * chosen persona ("Maya is listening…", "MAYA" in the transcript).
 */
import { usePrefs } from "@/lib/stores/prefs";

export interface Persona {
  id: "maya" | "leo" | "nova";
  name: string;
  /** One-word vibe under the name in the picker */
  vibe: string;
  /** ElevenLabs voice id (premade voices verified on this account) */
  voiceId: string;
  /** Figma voice-orb asset */
  orb: string;
}

export const PERSONAS: Persona[] = [
  { id: "maya", name: "Maya", vibe: "Warm", voiceId: "cgSgspJ2msm6clMCkdW9", orb: "/figma/voices/orb-maya.svg" },
  { id: "leo", name: "Leo", vibe: "Calm", voiceId: "nPczCjzI2devNBz1zQrb", orb: "/figma/voices/orb-leo.svg" },
  { id: "nova", name: "Nova", vibe: "Upbeat", voiceId: "FGY2WhTYpPnrIDTdsKH5", orb: "/figma/voices/orb-nova.svg" },
];

export const DEFAULT_PERSONA = PERSONAS[0];

/** Persona for a stored voice id (unknown or unset -> Maya) */
export function personaFor(voiceId?: string | null): Persona {
  return PERSONAS.find((p) => p.voiceId === voiceId) ?? DEFAULT_PERSONA;
}

/** The selected persona, reactive */
export function usePersona(): Persona {
  return personaFor(usePrefs((s) => s.voiceId));
}

/** The assistant's display name ("Maya"), reactive */
export function useAssistantName(): string {
  return usePersona().name;
}

/** Non-React access (engine, chat context) */
export function currentPersona(): Persona {
  return personaFor(usePrefs.getState().voiceId);
}
