"use client";

import { Check, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchJSON } from "@/lib/http";
import { usePrefs } from "@/lib/stores/prefs";
import type { VoiceOption, VoicesResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { playTts, stopPlayback } from "@/lib/voice/audio";
import { cancelListening, stopSpeaking, unlockAudio } from "@/lib/voice/engine";

/** Mirrors the server's verified premade list, for when /api/voices is unreachable. */
const FALLBACK_VOICES: VoiceOption[] = [
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Playful, Bright, Warm", accent: "american" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Warm, Captivating Storyteller", accent: "british" },
  { id: "hpp4J3VqNfWAUOO0d1Us", name: "Bella", description: "Professional, Bright, Warm", accent: "american" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", description: "Charming, Down-to-Earth", accent: "american" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", description: "Deep, Confident, Energetic", accent: "australian" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Velvety Actress", accent: "british" },
];

const SWATCHES = [
  "linear-gradient(135deg,#ffb08a,#f2542d)",
  "linear-gradient(135deg,#ffe29a,#f6c350)",
  "linear-gradient(135deg,#a8dcb6,#3f8f5b)",
  "linear-gradient(135deg,#b7c8f3,#6a8de0)",
  "linear-gradient(135deg,#ffc2ae,#e8664a)",
  "linear-gradient(135deg,#dcbcf0,#b06ad8)",
];

/** Live list survives remounts so returning to the AI tab doesn't flash skeletons. */
let liveVoices: VoiceOption[] | null = null;

async function loadVoices(): Promise<VoiceOption[]> {
  try {
    const res = await fetchJSON<VoicesResponse>("/api/voices", { timeoutMs: 8000 });
    const voices = Array.isArray(res?.voices) ? res.voices.filter((v) => v && typeof v.id === "string" && v.name) : [];
    if (!voices.length) return FALLBACK_VOICES;
    if (res.source === "elevenlabs") liveVoices = voices.slice(0, 6);
    return voices.slice(0, 6);
  } catch {
    return FALLBACK_VOICES;
  }
}

export function VoicePicker({ className }: { className?: string }) {
  const voiceId = usePrefs((s) => s.voiceId);
  const userName = usePrefs((s) => s.userName);
  const [voices, setVoices] = useState<VoiceOption[] | null>(liveVoices);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const previewAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (liveVoices) return;
    let alive = true;
    void loadVoices().then((list) => {
      if (!alive) return;
      setVoices(list);
      const prefs = usePrefs.getState();
      if (!prefs.voiceId && list[0]) prefs.setVoice(list[0].id, list[0].name);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Stop any preview when leaving the screen.
  useEffect(() => {
    return () => {
      previewAudio.current?.pause();
      previewAudio.current = null;
    };
  }, []);

  function stopPreview() {
    previewAudio.current?.pause();
    previewAudio.current = null;
    stopPlayback();
    setPreviewing(null);
  }

  function select(v: VoiceOption) {
    usePrefs.getState().setVoice(v.id, v.name);
  }

  function preview(v: VoiceOption) {
    unlockAudio();
    if (previewing === v.id) {
      stopPreview();
      return;
    }
    stopPreview();
    // Half-duplex holds for previews too: close the mic and quiet Sous first.
    cancelListening();
    stopSpeaking();
    setPreviewing(v.id);
    const done = () => setPreviewing((p) => (p === v.id ? null : p));
    const sample = `Hi ${userName}, I'm ${v.name}. Tell me what's in your fridge and we'll figure out dinner.`;
    const viaTts = () => void playTts(sample, v.id).finally(done);

    if (!v.previewUrl) {
      viaTts();
      return;
    }
    const audio = new Audio(v.previewUrl);
    previewAudio.current = audio;
    audio.onended = done;
    audio.onerror = () => {
      if (previewAudio.current !== audio) return;
      previewAudio.current = null;
      viaTts();
    };
    audio.play().catch(() => {
      if (previewAudio.current !== audio) return;
      previewAudio.current = null;
      viaTts();
    });
  }

  if (!voices) {
    return (
      <div className={cn("no-scrollbar -mx-5 flex gap-3 overflow-x-hidden px-5 pb-3", className)} aria-label="Loading voices">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[154px] w-[150px] shrink-0 rounded-tile skeleton" />
        ))}
      </div>
    );
  }

  const selectedId = voiceId ?? voices[0]?.id;

  return (
    <div
      role="radiogroup"
      aria-label="Sous's voice"
      className={cn("no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 pt-1", className)}
    >
      {voices.map((v, i) => {
        const selected = v.id === selectedId;
        const playing = previewing === v.id;
        return (
          <div
            key={v.id}
            className={cn(
              "relative flex w-[150px] shrink-0 snap-start flex-col rounded-tile bg-surface p-3.5 shadow-card ring-2 transition animate-fade-up",
              selected ? "ring-accent" : "ring-transparent",
            )}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Use ${v.name}'s voice`}
              onClick={() => select(v)}
              className="absolute inset-0 rounded-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <div className="pointer-events-none flex items-start justify-between">
              <span
                className="flex size-10 items-center justify-center rounded-full font-display text-lg font-semibold text-white shadow-soft"
                style={{ background: SWATCHES[i % SWATCHES.length] }}
              >
                {v.name.charAt(0)}
              </span>
              {selected && (
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-white animate-pop">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </div>
            <p className="pointer-events-none mt-3 truncate font-semibold text-ink">{v.name}</p>
            <p className="pointer-events-none mt-0.5 line-clamp-2 min-h-8 text-xs leading-4 text-ink-soft">
              {v.description}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="pointer-events-none truncate text-[11px] font-medium capitalize text-ink-faint">
                {v.accent ?? ""}
              </span>
              <button
                type="button"
                onClick={() => preview(v)}
                aria-label={playing ? `Stop ${v.name} preview` : `Preview ${v.name}`}
                className={cn(
                  "relative z-10 -mb-1 -mr-1 inline-flex size-11 items-center justify-center rounded-full transition active:scale-95",
                  playing ? "bg-accent text-white shadow-accent" : "bg-accent-soft text-accent-strong",
                )}
              >
                {playing ? <Square className="size-4 fill-current" /> : <Play className="ml-0.5 size-4 fill-current" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

