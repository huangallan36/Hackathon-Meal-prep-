"use client";

/**
 * Figma 1.1 "Pick your sous-chef": Maya / Leo / Nova tiles (46px voice orb, name, vibe).
 * Selected = green tint + 1.5px green border. Tapping a tile selects that persona (its
 * ElevenLabs voice and name) and plays a short sample: the voice's ElevenLabs preview clip
 * when /api/voices lists one, else a one-line hello through /api/tts. Selection never waits
 * on the sample.
 */
import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/http";
import { usePrefs } from "@/lib/stores/prefs";
import type { VoiceOption, VoicesResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playTts, stopPlayback } from "@/lib/voice/audio";
import { cancelListening, stopSpeaking, unlockAudio } from "@/lib/voice/engine";
import { PERSONAS, selectPersona, usePersona, type Persona } from "@/lib/voice/persona";

/* ------------------------------------------------------------------ */
/* Samples                                                             */
/* ------------------------------------------------------------------ */

/** The voice list (for preview clips), fetched once per page load */
let voicesPromise: Promise<VoiceOption[]> | null = null;

function loadVoices(): Promise<VoiceOption[]> {
  voicesPromise ??= fetchJSON<VoicesResponse>("/api/voices", { timeoutMs: 8000 })
    .then((res) => (Array.isArray(res?.voices) ? res.voices.filter((v) => v && typeof v.id === "string") : []))
    .catch(() => {
      voicesPromise = null;
      return [];
    });
  return voicesPromise;
}

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
function playPersonaSample(persona: Persona, userName: string, done: () => void): void {
  stopPersonaSample();
  // Half-duplex holds for samples too: close the mic and quiet Sous first.
  cancelListening();
  stopSpeaking();
  const id = sampleSeq;
  const finish = () => {
    if (id === sampleSeq) done();
  };
  const hello = () => {
    if (id !== sampleSeq) return;
    sampleViaTts = true;
    const who = userName ? `Hi ${userName}, I'm ${persona.name}.` : `Hi, I'm ${persona.name}.`;
    void playTts(`${who} Let's figure out dinner together.`, persona.voiceId).finally(() => {
      if (id === sampleSeq) sampleViaTts = false;
      finish();
    });
  };

  void loadVoices().then((voices) => {
    if (id !== sampleSeq) return;
    const url = voices.find((v) => v.id === persona.voiceId)?.previewUrl;
    if (!url) {
      hello();
      return;
    }
    const audio = new Audio(url);
    sampleEl = audio;
    const fail = () => {
      if (sampleEl !== audio) return;
      sampleEl = null;
      hello();
    };
    audio.onended = () => {
      if (sampleEl === audio) sampleEl = null;
      finish();
    };
    audio.onerror = fail;
    audio.play().catch(fail);
  });
}

/* ------------------------------------------------------------------ */
/* Picker                                                              */
/* ------------------------------------------------------------------ */

export function PersonaPicker({ className }: { className?: string }) {
  const selected = usePersona();
  const userName = usePrefs((s) => s.userName);
  const [sampling, setSampling] = useState<Persona["id"] | null>(null);

  // Warm the voice list so a tap plays its clip right away; stop any sample on leave.
  useEffect(() => {
    void loadVoices();
    return () => stopPersonaSample();
  }, []);

  function pick(persona: Persona) {
    unlockAudio();
    selectPersona(persona);
    setSampling(persona.id);
    playPersonaSample(persona, userName, () => setSampling((s) => (s === persona.id ? null : s)));
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
