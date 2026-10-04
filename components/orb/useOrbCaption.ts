"use client";

/**
 * What the small orbs (floating orb, docked bubble) say beside themselves: the live
 * transcript while listening, the user's line while thinking, Sous's latest line while
 * speaking and for a few seconds after, and hands-free hints ("Still there?").
 */
import { useEffect, useState } from "react";
import { REST_HINTS } from "@/components/voice/HandsFree";
import { statusLabel } from "@/components/voice/status";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import type { VoiceStatus } from "@/lib/types";
import { useAssistantName } from "@/lib/voice/persona";

/** Captions fade this long after Sous finishes talking */
export const CAPTION_MS = 6000;
/** Hands-free hints stay a little longer: they ask for a tap */
const REST_HINT_MS = 10_000;

export interface OrbCaption {
  /** Status to draw (paused shows as idle) */
  visual: VoiceStatus;
  paused: boolean;
  sessionActive: boolean;
  /** Interim transcript (bumps the orb while the user talks) */
  interim: string;
  /** Something worth showing beside the orb right now */
  show: boolean;
  label: string;
  text: string;
  /** Listening or thinking: the line is in progress (italic, pulsing dot) */
  live: boolean;
}

/** @param busyOnly only show while Sous is listening or thinking (screens with buttons where the bubble sits) */
export function useOrbCaption(busyOnly = false): OrbCaption {
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const sessionActive = useVoice((s) => s.sessionActive);
  const interim = useVoice((s) => s.interim);
  const caption = useVoice((s) => s.caption);
  const captionAt = useVoice((s) => s.captionAt);
  const rest = useVoice((s) => s.handsFreeRest);
  const restAt = useVoice((s) => s.handsFreeRestAt);
  const handsFree = usePrefs((s) => s.handsFree);
  const name = useAssistantName();
  const lastUserLine = useVoice((s) => {
    for (let i = s.transcript.length - 1; i >= 0; i--) if (s.transcript[i].role === "user") return s.transcript[i].text;
    return "";
  });

  const [expiredAt, setExpiredAt] = useState(0);
  useEffect(() => {
    if (!captionAt || status === "speaking") return;
    const t = setTimeout(() => setExpiredAt(captionAt), CAPTION_MS);
    return () => clearTimeout(t);
  }, [captionAt, status]);

  const [restExpiredAt, setRestExpiredAt] = useState(0);
  useEffect(() => {
    if (!restAt) return;
    const t = setTimeout(() => setRestExpiredAt(restAt), REST_HINT_MS);
    return () => clearTimeout(t);
  }, [restAt]);

  const visual: VoiceStatus = paused ? "idle" : status;
  const listening = visual === "listening";
  const thinking = visual === "thinking";
  const busy = listening || thinking;
  const restHint =
    handsFree && rest && restAt !== restExpiredAt && visual === "idle" && !paused ? REST_HINTS[rest] : null;
  const captionFresh = !!caption && captionAt !== expiredAt;
  const show = sessionActive && (busyOnly ? busy : visual !== "idle" || paused || !!restHint || captionFresh);

  const text = listening
    ? interim || "Go ahead, I'm listening."
    : thinking
      ? lastUserLine
        ? `“${lastUserLine}”`
        : "One sec..."
      : restHint || caption || "Tap the orb to talk.";
  const label = paused
    ? "Paused"
    : restHint
      ? "Hands-free"
      : status === "idle" || status === "speaking"
        ? name
        : statusLabel(status, false);

  return { visual, paused, sessionActive, interim, show, label, text, live: busy };
}
