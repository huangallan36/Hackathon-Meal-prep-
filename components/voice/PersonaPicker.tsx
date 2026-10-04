"use client";

/**
 * Figma 1.1 "Pick your sous-chef": Maya / Leo / Nova tiles (46px voice orb, name, vibe).
 * Selected = green tint + 1.5px green border. Tapping a tile selects that persona (its
 * ElevenLabs voice and name) and plays its in-character greeting: the pre-recorded clip in
 * /public/voices (scripts/gen-voice-samples.mjs), else the same line live through /api/tts.
 * Selection never waits on the sample.
 */
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { playTts, stopPlayback } from "@/lib/voice/audio";
import { cancelListening, stopSpeaking, unlockAudio } from "@/lib/voice/engine";
import { PERSONAS, selectPersona, usePersona, type Persona } from "@/lib/voice/persona";

/* ------------------------------------------------------------------ */
/* Samples                                                             */
/* ------------------------------------------------------------------ */

let sampleEl: HTMLAudioElement | null = null;
let sampleSeq = 0;
let sampleViaTts = false;

/** Stop a persona sample (preview clip or TTS hello) if one is playing. */
export function stopPersonaSample(): void {
  sampleSeq++;
  if (sampleEl) {
    sampleEl.onended = null;
    sampleEl.onerror = null;
    sampleEl.pause();
    sampleEl = null;
  }
  if (sampleViaTts) {
    sampleViaTts = false;
    stopPlayback();
  }
}

/** Play `persona`'s sample; `done` runs when it ends or is replaced. Call inside the tap. */
function playPersonaSample(persona: Persona, done: () => void): void {
  stopPersonaSample();
  // Half-duplex holds for samples too: close the mic and quiet Sous first.
  cancelListening();
  stopSpeaking();
  const id = sampleSeq;
  const finish = () => {
    if (id === sampleSeq) done();
  };
  // Fallback: say the same greeting live with the persona's ElevenLabs voice.
  const live = () => {
    if (id !== sampleSeq) return;
    sampleViaTts = true;
    void playTts(persona.greeting, persona.voiceId).finally(() => {
      if (id === sampleSeq) sampleViaTts = false;
      finish();
    });
  };

  const audio = new Audio(persona.sample);
  sampleEl = audio;
  const fail = () => {
    if (sampleEl !== audio) return;
    sampleEl = null;
    live();
  };
  audio.onended = () => {
    if (sampleEl === audio) sampleEl = null;
    finish();
  };
  audio.onerror = fail;
  audio.play().catch(fail);
}

/* ------------------------------------------------------------------ */
/* Picker                                                              */
/* ------------------------------------------------------------------ */

export function PersonaPicker({ className }: { className?: string }) {
  const selected = usePersona();
  const [sampling, setSampling] = useState<Persona["id"] | null>(null);

  // Stop any greeting that's still playing when the picker goes away.
  useEffect(() => () => stopPersonaSample(), []);

  function pick(persona: Persona) {
    unlockAudio();
    selectPersona(persona);
    setSampling(persona.id);
    playPersonaSample(persona, () => setSampling((s) => (s === persona.id ? null : s)));
  }

  return (
    <div role="radiogroup" aria-label="Pick your sous-chef" className={cn("flex w-full items-start gap-2", className)}>
      {PERSONAS.map((p) => {
        const on = p.id === selected.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${p.name}, ${p.vibe.toLowerCase()} voice`}
            onClick={() => pick(p)}
            className={cn(
              "flex min-w-px flex-1 flex-col items-center gap-1.5 rounded-[16px] border-[1.5px] py-3 transition-[background-color,border-color,transform] duration-200 active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              on ? "border-accent bg-accent-soft" : "border-transparent bg-cream",
            )}
          >
            <img
              src={p.orb}
              alt=""
              width={46}
              height={46}
              className={cn("block size-[46px]", sampling === p.id && "animate-pulse")}
            />
            <span className="whitespace-nowrap text-sm font-semibold text-ink">{p.name}</span>
            <span className="whitespace-nowrap text-caption text-ink-soft">{p.vibe}</span>
          </button>
        );
      })}
    </div>
  );
}
