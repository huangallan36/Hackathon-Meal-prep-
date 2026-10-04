"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { estimateFoods, logFoods } from "@/lib/diary/estimate";
import { fmt, MEAL_LABEL } from "@/lib/diary/stats";
import { toast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";
import type { ISODate, MealType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { speak, stopSpeaking, unlockAudio } from "@/lib/voice/engine";
import { isSttSupported, listenOnceDetailed, stopListening, type ListenResult } from "@/lib/voice/stt";

type Phase = "idle" | "listening" | "logging";

/** "Greek yogurt, granola and blueberries" */
function listNames(names: string[]): string {
  const n = names.map((s) => s.trim()).filter(Boolean);
  if (n.length <= 1) return n[0] ?? "that";
  const shown = n.slice(0, 3);
  const rest = n.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} and ${rest} more`;
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

/**
 * Figma 3.3 "Log dinner by voice": listen once, let Sous estimate what was said, log it to
 * that meal and day, and say so. No speech recognition (or a blocked mic) opens the typed
 * "Add to <meal>" sheet instead (`onFallback`).
 */
export function VoiceLogButton({
  meal,
  date,
  onFallback,
  className,
}: {
  meal: MealType;
  date: ISODate;
  onFallback: () => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const interim = useVoice((s) => s.interim);
  const alive = useRef(true);
  const ownsMic = useRef(false);
  const label = MEAL_LABEL[meal].toLowerCase();

  // Leaving the screen closes our mic (never someone else's).
  useEffect(() => {
    const live = alive;
    const mic = ownsMic;
    live.current = true;
    return () => {
      live.current = false;
      if (mic.current) stopListening();
    };
  }, []);

  async function run() {
    if (phase === "listening") {
      stopListening();
      return;
    }
    if (phase !== "idle") return;
    if (!isSttSupported()) {
      onFallback();
      return;
    }
    try {
      stopSpeaking();
      unlockAudio(); // inside the tap, so the spoken confirmation may play later (iOS)
    } catch {
      /* audio is optional */
    }

    const wasTyping = useVoice.getState().typing;
    setPhase("listening");
    ownsMic.current = true;
    let heard: ListenResult;
    try {
      heard = await listenOnceDetailed();
    } catch {
      heard = { text: "", outcome: "error" };
    } finally {
      ownsMic.current = false;
    }
    // A blocked mic opens the voice typing sheet; the Add sheet is the better fallback here.
    if (!wasTyping && useVoice.getState().typing) useVoice.getState().setTyping(false);

    if (heard.outcome === "blocked" || heard.outcome === "error") {
      if (alive.current) {
        setPhase("idle");
        onFallback();
      }
      return;
    }
    const text = heard.text.trim();
    if (!text) {
      if (alive.current) setPhase("idle");
      if (heard.outcome === "silence") toast("Didn't catch that. Tap and say what you had.", "default");
      return;
    }

    if (alive.current) setPhase("logging");
    try {
      const est = await estimateFoods(text, meal);
      if (!est.items.length) {
        toast("Couldn't find any food in that. Try again?", "warning");
        return;
      }
      const logged = logFoods(est.items, meal, date);
      if (!logged.length) {
        toast("Couldn't save that. Try again?", "warning");
        return;
      }
      const kcal = logged.reduce((a, e) => a + (e.nutrition.calories || 0), 0);
      toast(`Added to ${MEAL_LABEL[meal]} · ${fmt(kcal)} kcal`, "success");
      void speak(`Logged ${listNames(logged.map((e) => e.name))} for ${label}. That's about ${fmt(kcal)} calories.`, {
        onlyIfSession: false,
      }).catch(() => undefined);
    } catch (err) {
      console.warn("[diary] voice log failed:", err instanceof Error ? err.message : err);
      toast("Couldn't log that. Try again?", "warning");
    } finally {
      if (alive.current) setPhase("idle");
    }
  }

  const listening = phase === "listening";
  return (
    <div className={cn("flex flex-col items-stretch gap-1.5", className)}>
      <Button
        variant="voice"
        full
        loading={phase === "logging"}
        aria-pressed={listening}
        onClick={() => void run()}
        icon={<img src="/figma/screens/2-159/frame.svg" alt="" width={18} height={18} className={cn("block size-[18px]", listening && "animate-pulse")} />}
        className={cn("h-10 text-sm", listening && "ring-4 ring-flame/25")}
      >
        {phase === "logging" ? `Logging ${label}...` : listening ? "Listening... tap when done" : `Log ${label} by voice`}
      </Button>
      {listening && (
        <p className="truncate px-2 text-center text-meta text-ink-soft" aria-live="polite">
          {interim ? `“${interim}”` : `Say what you had for ${label}`}
        </p>
      )}
    </div>
  );
}
