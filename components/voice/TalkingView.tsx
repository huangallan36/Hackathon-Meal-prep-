"use client";

/**
 * Figma 1.2 "ai chat — talking": the dark live call. Header (dock to bubble, persona +
 * live timer, audio settings), the orb stage, the live transcript with quick actions, the
 * hands-free switch and the call controls (Pause, Type, End).
 */
import { Play } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { OrbStage } from "@/components/orb/OrbStage";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice, type HandsFreeRest } from "@/lib/stores/voice";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isSttSupported, openTyping, orbTap, togglePause } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";
import { AudioSheet } from "./AudioSheet";
import { HangUpIcon } from "./HangUpIcon";
import { HANDS_FREE_LIVE_HINT, HandsFreeSwitch, REST_HINTS, useHandsFree } from "./HandsFree";
import { LiveTranscript } from "./LiveTranscript";
import { useCallNav, useCallTimer } from "./useCall";

/** Below this phone height the orb stage shrinks so the transcript keeps room. */
const COMPACT_BELOW_PX = 760;

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function isCompactFrame(): boolean {
  const h = document.getElementById("sous-phone")?.clientHeight || window.innerHeight;
  return h < COMPACT_BELOW_PX;
}

function hint(
  status: VoiceStatus,
  paused: boolean,
  hasConversation: boolean,
  sttOk: boolean,
  handsFree: { on: boolean; rest: HandsFreeRest | null },
): string {
  if (!sttOk) return "Voice input isn't available here. Tap Type to chat.";
  if (paused) return "Paused · tap Resume to keep going";
  switch (status) {
    case "listening":
      return handsFree.on ? "Listening... just talk" : "Listening... tap the orb when you're done";
    case "thinking":
      return "";
    case "speaking":
      return "Tap the orb to interrupt";
    default:
      if (handsFree.on) return handsFree.rest ? REST_HINTS[handsFree.rest] : HANDS_FREE_LIVE_HINT;
      return hasConversation ? "Tap the orb to reply" : "Tap the orb and start talking";
  }
}

export function TalkingView() {
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const interimLength = useVoice((s) => s.interim.length);
  const hasConversation = useVoice((s) => s.transcript.length > 0);
  const handsFreeOn = usePrefs((s) => s.handsFree);
  const handsFree = useHandsFree();
  const persona = usePersona();
  const timer = useCallTimer();
  const { minimize, hangUp } = useCallNav();
  const [sttOk] = useState(isSttSupported);
  const [audioOpen, setAudioOpen] = useState(false);
  const compact = useSyncExternalStore(subscribeResize, isCompactFrame, () => false);

  const visual: VoiceStatus = paused ? "idle" : status;
  const line = hint(visual, paused, hasConversation, sttOk, handsFree);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-call-top to-call-bottom text-white">
      {/* Call header */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-[calc(var(--safe-top)+6px)]">
        <HeaderButton label="Minimize to a floating bubble" onClick={minimize}>
          <img src="/figma/screens/2-139/icon-chev-d.svg" alt="" width={20} height={20} className="block size-5" />
        </HeaderButton>
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <p className="truncate text-base font-semibold text-white">{persona.name}</p>
          <p className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-white/70" aria-live="off">
            {paused ? (
              <span aria-hidden className="block size-[7px] rounded-full bg-white/45" />
            ) : (
              <img src="/figma/screens/2-139/ellipse.svg" alt="" width={7} height={7} className="block size-[7px]" />
            )}
            {paused ? "Paused" : "Live"} · {timer}
          </p>
        </div>
        <HeaderButton label="Audio and voice settings" onClick={() => setAudioOpen(true)}>
          <img src="/figma/screens/2-139/icon-bluetooth.svg" alt="" width={18} height={18} className="block size-[18px]" />
        </HeaderButton>
      </header>

      <OrbStage status={visual} onClick={orbTap} activity={interimLength} scale={compact ? 0.8 : 1}>
        <p
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute inset-x-6 bottom-0 truncate text-center text-xs font-medium",
            handsFreeOn && !paused && visual === "idle" && !handsFree.rest ? "text-live" : "text-white/55",
          )}
        >
          {line}
        </p>
      </OrbStage>

      <LiveTranscript className="min-h-0 flex-1" />

      <div className="flex shrink-0 flex-col items-center gap-3.5 pb-[calc(var(--safe-bottom)+38px)] pt-1.5">
        <HandsFreeSwitch dark />
        <div className="flex items-start gap-9">
          <CallControl
            label={paused ? "Resume" : "Pause"}
            onClick={togglePause}
            pressed={paused}
            icon={
              paused ? (
                <Play aria-hidden className="ml-0.5 size-[26px] fill-white text-white" strokeWidth={1.8} />
              ) : (
                <img src="/figma/screens/2-139/icon-pause.svg" alt="" width={26} height={26} className="block size-[26px]" />
              )
            }
          />
          <CallControl
            label="Type"
            onClick={openTyping}
            icon={<img src="/figma/screens/2-139/icon-keyboard.svg" alt="" width={26} height={26} className="block size-[26px]" />}
          />
          <CallControl label="End" tone="end" onClick={hangUp} icon={<HangUpIcon />} />
        </div>
      </div>

      <AudioSheet open={audioOpen} onClose={() => setAudioOpen(false)} />
    </div>
  );
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-[20px] bg-white/10 transition after:absolute after:-inset-1 after:content-[''] hover:bg-white/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {children}
    </button>
  );
}

/** Figma call control: 66px circle (white/14, or flame for End) with a 12px label */
function CallControl({
  label,
  icon,
  onClick,
  tone = "neutral",
  pressed,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "end";
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="group flex flex-col items-center gap-2 rounded-tile focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex size-[66px] items-center justify-center rounded-[33px] transition group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-white/70 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-call-bottom",
          tone === "end" ? "bg-flame group-hover:brightness-105" : pressed ? "bg-white/25" : "bg-white/14 group-hover:bg-white/20",
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-medium text-white/75">{label}</span>
    </button>
  );
}
