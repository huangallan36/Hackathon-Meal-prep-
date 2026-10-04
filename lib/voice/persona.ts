"use client";

/**
 * The chosen persona (Maya / Leo / Nova / Brock the coach; Leo by default). Each maps to an
 * ElevenLabs premade voice; the assistant speaks with that voice, wears that mascot and is
 * labelled with that name everywhere ("LEO" in the transcript, "Sous · Leo" on the live
 * activity, "You are Leo" in the prompt). The persona data itself lives in ./personas
 * (server-safe).
 */
import { usePrefs } from "@/lib/stores/prefs";
import { personaFor, type Persona } from "./personas";

export {
  DEFAULT_PERSONA,
  PERSONAS,
  personaFor,
  personaNamed,
  type MascotState,
  type Persona,
  type PersonaId,
} from "./personas";

/** The selected persona, reactive */
export function usePersona(): Persona {
  return personaFor(usePrefs((s) => s.voiceId));
}

/** The assistant's display name ("Leo"), reactive */
export function useAssistantName(): string {
  return usePersona().name;
}

/** Non-React access (engine, chat context) */
export function currentPersona(): Persona {
  return personaFor(usePrefs.getState().voiceId);
}

/**
 * The ElevenLabs voice Sous speaks with: the chosen persona's voice (Leo's when unset).
 * A voice id left over from the old six-voice picker maps to Leo too, so the name and
 * mascot on screen and the voice always match.
 */
export function ttsVoiceId(): string {
  return currentPersona().voiceId;
}

/** Select a persona (home picker, audio sheet) */
export function selectPersona(persona: Persona): void {
  usePrefs.getState().setVoice(persona.voiceId, persona.name);
}
