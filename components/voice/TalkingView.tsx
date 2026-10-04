"use client";

/**
 * Figma call screen (5.1 Maya, 5.2 Leo = 1.2 talking, 5.3 Nova, 5.4 Brock; 5.6 dark mode).
 * It follows the phone: white in light mode, #0B0B0B in dark mode. Header (dock to a bubble,
 * persona + live timer, audio settings), the persona's mascot on its rings, the live transcript
 * with quick actions, the hands-free switch and the call controls (Pause, Type, End), which
 * never change size or position between voices.
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
import { HANDS_FREE_LIVE_HINT, HandsFreeSwitch, restHint, useHandsFree } from "./HandsFree";
import { LiveTranscript } from "./LiveTranscript";
import { useCallNav, useCallTimer } from "./useCall";
import { useCallTheme, type CallTheme } from "./useCallTheme";

/** Below this phone height the stage shrinks so the transcript keeps room. */
const COMPACT_BELOW_PX = 760;

/** Figma icon exports: ink on the light call (5.2), white on the dark one (5.6) */
const ICON_DIR: Record<CallTheme, string> = { light: "/figma/v2/2014-2091", dark: "/figma/v2/2014-2514" };

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
  name: string,
): string {
  if (!sttOk) return "Voice input isn't available here. Tap Type to chat.";
  if (paused) return "Paused · tap Resume to keep going";
  switch (status) {
    case "listening":
      return handsFree.on ? "Listening... just talk" : `Listening... tap ${name} when you're done`;
    case "thinking":
      return "";
    case "speaking":
      return `Tap ${name} to interrupt`;
    default:
      if (handsFree.on) return handsFree.rest ? restHint(handsFree.rest, name) : HANDS_FREE_LIVE_HINT;
      return hasConversation ? `Tap ${name} to reply` : `Tap ${name} and start talking`;
  }
}

/** What tapping the mascot does right now (its accessible name) */
function mascotLabel(status: VoiceStatus, name: string): string {
  switch (status) {
    case "listening":
      return "Listening. Tap when you're done";
    case "thinking":
      return `${name} is thinking`;
    case "speaking":
      return `${name} is speaking. Tap to interrupt`;
    default:
      return `Talk to ${name}`;
  }
}

export function TalkingView() {
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const hasConversation = useVoice((s) => s.transcript.length > 0);
  const handsFreeOn = usePrefs((s) => s.handsFree);
  const handsFree = useHandsFree();
  const persona = usePersona();
  const theme = useCallTheme();
  const timer = useCallTimer();
  const { minimize, hangUp } = useCallNav();
  const [sttOk] = useState(isSttSupported);
  const [audioOpen, setAudioOpen] = useState(false);
  const compact = useSyncExternalStore(subscribeResize, isCompactFrame, () => false);
  const dark = theme === "dark";
  const icons = ICON_DIR[theme];

  const visual: VoiceStatus = paused ? "idle" : status;
  const line = hint(visual, paused, hasConversation, sttOk, handsFree, persona.name);
  const liveHint = handsFreeOn && !paused && visual === "idle" && !handsFree.rest;

  return (
    <div
      data-call-theme={theme}
      className={cn("relative flex h-full flex-col overflow-hidden", dark ? "bg-call-dark text-white" : "bg-surface text-ink")}
    >
      {/* Call header: 40px soft circles, name + live dot + timer */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-[calc(var(--safe-top)+6px)]">
        <HeaderButton dark={dark} label="Minimize to a floating bubble" onClick={minimize}>
          <img src={`${icons}/icon-chev-d.svg`} alt="" width={20} height={20} className="block size-5" />
        </HeaderButton>
        <div className="flex min-w-0 flex-col items-center gap-0.5">
          <p className="truncate text-base font-semibold">{persona.name}</p>
          <p
            className={cn("flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", dark ? "text-white/70" : "text-ink/70")}
            aria-live="off"
          >
            {paused ? (
              <span aria-hidden className={cn("block size-[7px] rounded-full", dark ? "bg-white/45" : "bg-ink/30")} />
            ) : (
              <img src="/figma/v2/2014-2091/ellipse.svg" alt="" width={7} height={7} className="block size-[7px]" />
            )}
            <span className="sr-only">{paused ? "Paused, " : "Live, "}</span>
            {paused ? `Paused · ${timer}` : timer}
          </p>
        </div>
        <HeaderButton dark={dark} label="Audio and voice settings" onClick={() => setAudioOpen(true)}>
          <img src={`${icons}/icon-bluetooth.svg`} alt="" width={18} height={18} className="block size-[18px]" />
        </HeaderButton>
      </header>

      <OrbStage
        status={visual}
        theme={theme}
        onClick={orbTap}
        label={mascotLabel(visual, persona.name)}
        scale={compact ? 0.8 : 1}
      />

      {/* Pulled up by its 8px top fade, so "YOU" sits right under the stage like the design */}
      <LiveTranscript theme={theme} className="-mt-2 min-h-0 flex-1" />

      <div className="flex shrink-0 flex-col items-center gap-3.5 pb-[calc(var(--safe-bottom)+38px)] pt-1.5">
        <div className="flex w-full flex-col items-center gap-2.5">
          {/* What a tap on the mascot does now; a fixed line, so nothing below ever moves */}
          <p
            aria-live="polite"
            className={cn(
              "h-4 max-w-full truncate px-6 text-center text-xs font-medium",
              liveHint ? (dark ? "text-live" : "text-accent") : dark ? "text-white/55" : "text-ink/50",
            )}
          >
            {line}
          </p>
          <HandsFreeSwitch tone={dark ? "call-dark" : "call-light"} />
        </div>
        <div className="flex items-start gap-9">
          <CallControl
            dark={dark}
            label={paused ? "Resume" : "Pause"}
            onClick={togglePause}
            pressed={paused}
            icon={
              paused ? (
                <Play
                  aria-hidden
                  className={cn("ml-0.5 size-[26px]", dark ? "fill-white text-white" : "fill-ink text-ink")}
                  strokeWidth={1.8}
                />
              ) : (
                <img src={`${icons}/icon-pause.svg`} alt="" width={26} height={26} className="block size-[26px]" />
              )
            }
          />
          <CallControl
            dark={dark}
            label="Type"
            onClick={openTyping}
            icon={<img src={`${icons}/icon-keyboard.svg`} alt="" width={26} height={26} className="block size-[26px]" />}
          />
          <CallControl dark={dark} label="End" tone="end" onClick={hangUp} icon={<HangUpIcon />} />
        </div>
      </div>

      <AudioSheet open={audioOpen} onClose={() => setAudioOpen(false)} />
    </div>
  );
}

/** Figma call header button: 40px circle, ink 6% (white 10% on the dark call) */
function HeaderButton({
  dark,
  label,
  onClick,
  children,
}: {
  dark: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-[20px] transition after:absolute after:-inset-1 after:content-[''] active:scale-95 focus-visible:outline-none focus-visible:ring-2",
        dark ? "bg-white/10 hover:bg-white/15 focus-visible:ring-white/60" : "bg-ink/6 hover:bg-ink/10 focus-visible:ring-accent",
      )}
    >
      {children}
    </button>
  );
}

/** Figma call control: 66px circle (ink 6% / white 14%, or tomato for End) with a 12px label */
function CallControl({
  dark,
  label,
  icon,
  onClick,
  tone = "neutral",
  pressed,
}: {
  dark: boolean;
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
          "flex size-[66px] items-center justify-center rounded-[33px] transition group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-offset-2",
          dark
            ? "group-focus-visible:ring-white/70 group-focus-visible:ring-offset-call-dark"
            : "group-focus-visible:ring-accent group-focus-visible:ring-offset-surface",
          tone === "end"
            ? "bg-flame group-hover:brightness-105"
            : dark
              ? pressed
                ? "bg-white/25"
                : "bg-white/14 group-hover:bg-white/20"
              : pressed
                ? "bg-ink/12"
                : "bg-ink/6 group-hover:bg-ink/10",
        )}
      >
        {icon}
      </span>
      <span className={cn("text-xs font-medium", dark ? "text-white/75" : "text-ink/75")}>{label}</span>
    </button>
  );
}
