/**
 * The three sous-chef personas from the Figma home screen ("Pick your sous-chef").
 * Plain data with no imports, so both the client (lib/voice/persona.ts) and the server
 * (lib/server/elevenlabs.ts, the chat prompt) can use it.
 */

export type PersonaId = "maya" | "leo" | "nova";

export interface Persona {
  id: PersonaId;
  name: string;
  /** One-word vibe under the name in the picker */
  vibe: string;
  /** ElevenLabs premade voice id (verified on this account) */
  voiceId: string;
  /** Figma voice-orb asset (46px, radial gradient + white waveform) */
  orb: string;
  /** The orb's radial gradient, center -> edge (from the Figma voice-orb assets) */
  orbFrom: string;
  orbTo: string;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: "maya",
    name: "Maya",
    vibe: "Warm",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    orb: "/figma/voices/orb-maya.svg",
    orbFrom: "#f7cf7a",
    orbTo: "#e0603a",
  },
  {
    id: "leo",
    name: "Leo",
    vibe: "Calm",
    voiceId: "nPczCjzI2devNBz1zQrb",
    orb: "/figma/voices/orb-leo.svg",
    orbFrom: "#9bc7ae",
    orbTo: "#2f5d46",
  },
  {
    id: "nova",
    name: "Nova",
    vibe: "Upbeat",
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    orb: "/figma/voices/orb-nova.svg",
    orbFrom: "#a9c4ea",
    orbTo: "#4f7fb8",
  },
];

export const DEFAULT_PERSONA: Persona = PERSONAS[0];

/** Persona for a stored voice id (unknown or unset -> Maya) */
export function personaFor(voiceId?: string | null): Persona {
  return PERSONAS.find((p) => p.voiceId === voiceId) ?? DEFAULT_PERSONA;
}

export function isPersonaVoice(voiceId?: string | null): boolean {
  return PERSONAS.some((p) => p.voiceId === voiceId);
}
