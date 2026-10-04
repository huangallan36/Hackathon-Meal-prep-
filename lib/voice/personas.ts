/**
 * The sous-chef personas (Figma "Stormhacks-2026-Updated": Maya, Leo, Nova, Brock). Each is a
 * mascot with an ElevenLabs voice; the chosen one tints the AI surfaces (call rings, avatars,
 * speaker label). Plain data with no imports, so both the client (lib/voice/persona.ts) and
 * the server (lib/server/elevenlabs.ts, the chat prompt) can use it.
 */

export type PersonaId = "maya" | "leo" | "nova" | "brock";

export type MascotState = "idle" | "listening" | "thinking" | "speaking";

export interface Persona {
  id: PersonaId;
  name: string;
  /** One-word vibe under the name in the picker */
  vibe: string;
  /** What the mascot is (for alt text) */
  mascotLabel: string;
  /** ElevenLabs premade voice id (verified on this account) */
  voiceId: string;
  /** Speaker label / accent ink on light backgrounds (Figma call screens) */
  tint: string;
  /** Soft avatar / ring tint */
  soft: string;
  /** Mascot art (Figma "Mascot Head" / "Mascot" components) */
  head: string;
  body: string;
  /** Final per-state art where the design has it (Leo); others use `body` for every state */
  states?: Partial<Record<MascotState, string>>;
  /** Legacy orb fields (gradient voice orb), kept for surfaces not yet moved to mascots */
  orb: string;
  orbFrom: string;
  orbTo: string;
  /** In-character intro played when the persona is picked */
  greeting: string;
  /** Pre-recorded greeting (scripts/gen-voice-samples.mjs); live TTS of `greeting` is the fallback */
  sample: string;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: "maya",
    name: "Maya",
    vibe: "Warm",
    mascotLabel: "Maya the tomato",
    voiceId: "cgSgspJ2msm6clMCkdW9",
    tint: "#b8452e",
    soft: "#f8e4dd",
    head: "/mascots/maya/head.svg",
    body: "/mascots/maya/body.svg",
    orb: "/figma/voices/orb-maya.svg",
    orbFrom: "#f7cf7a",
    orbTo: "#e0603a",
    greeting: "Hey, I'm Maya. Long day? Pull up a stool and tell me what's in your fridge. We'll make something cozy together.",
    sample: "/voices/maya.mp3",
  },
  {
    id: "leo",
    name: "Leo",
    vibe: "Calm",
    mascotLabel: "Leo the avocado",
    voiceId: "nPczCjzI2devNBz1zQrb",
    tint: "#3d6b2e",
    soft: "#e7efdc",
    head: "/mascots/leo/head.svg",
    body: "/mascots/leo/body.svg",
    states: {
      idle: "/mascots/leo/idle.svg",
      listening: "/mascots/leo/listening.svg",
      thinking: "/mascots/leo/thinking.svg",
      speaking: "/mascots/leo/speaking.svg",
    },
    orb: "/figma/voices/orb-leo.svg",
    orbFrom: "#9bc7ae",
    orbTo: "#2f5d46",
    greeting: "Hi, I'm Leo. No rush tonight. Tell me what you've got, and I'll walk you through dinner, one easy step at a time.",
    sample: "/voices/leo.mp3",
  },
  {
    id: "nova",
    name: "Nova",
    vibe: "Upbeat",
    mascotLabel: "Nova the lemon",
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    tint: "#8a6d0e",
    soft: "#fbf0d9",
    head: "/mascots/nova/head.svg",
    body: "/mascots/nova/body.svg",
    orb: "/figma/voices/orb-nova.svg",
    orbFrom: "#a9c4ea",
    orbTo: "#4f7fb8",
    greeting: "Hey hey, I'm Nova! Let's turn whatever's in your fridge into something delicious. Ready when you are!",
    sample: "/voices/nova.mp3",
  },
  {
    id: "brock",
    name: "Brock",
    vibe: "Coach",
    mascotLabel: "Brock the broccoli",
    voiceId: "IKne3meq5aSn9XLyUdCD",
    tint: "#2e6b3a",
    soft: "#e3efe4",
    head: "/mascots/brock/head.svg",
    body: "/mascots/brock/body.svg",
    orb: "/figma/voices/orb-leo.svg",
    orbFrom: "#9bc7ae",
    orbTo: "#2e6b3a",
    greeting: "Brock here. Let's hit your protein and keep it simple. Tell me what you've got and we'll get cooking.",
    sample: "/voices/brock.mp3",
  },
];

/** Design rules v1: the default voice is Leo */
export const DEFAULT_PERSONA: Persona = PERSONAS.find((p) => p.id === "leo")!;

/** Persona for a stored voice id (unknown or unset -> Leo) */
export function personaFor(voiceId?: string | null): Persona {
  return PERSONAS.find((p) => p.voiceId === voiceId) ?? DEFAULT_PERSONA;
}

export function isPersonaVoice(voiceId?: string | null): boolean {
  return PERSONAS.some((p) => p.voiceId === voiceId);
}

/** Art for a mascot in a given voice state (falls back to the full body) */
export function mascotArt(persona: Persona, state: MascotState = "idle"): string {
  return persona.states?.[state] ?? persona.body;
}
