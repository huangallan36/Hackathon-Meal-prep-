"use client";

import { ChevronDown, Keyboard, Pause, PhoneOff, Play, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Orb } from "@/components/orb/Orb";
import { IconButton } from "@/components/ui/Button";
import { statusLabel } from "@/components/voice/StatusGlyph";
import { Transcript } from "@/components/voice/Transcript";
import { TypeSheet } from "@/components/voice/TypeSheet";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getPreviousPath } from "@/lib/voice/context";
import {
  endSession,
  handleUserText,
  isSttSupported,
  openTyping,
  orbTap,
  startSession,
  togglePause,
  unlockAudio,
} from "@/lib/voice/engine";

const STARTERS = ["I'm wiped, no idea what to cook", "What can I make with eggs and mushrooms?", "Scan my fridge"];

/** Below this phone height (laptop-sized desktop frame, most phones) the orb shrinks so the transcript keeps room. */
const COMPACT_BELOW_PX = 760;

function subscribeResize(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

function isCompactFrame(): boolean {
  const h = document.getElementById("sous-phone")?.clientHeight || window.innerHeight;
  return h < COMPACT_BELOW_PX;
}

export default function TalkPage() {
  const router = useRouter();
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const ttsEngine = useVoice((s) => s.ttsEngine);
  const hasConversation = useVoice((s) => s.transcript.length > 0);
  const offline = useVoice((s) => {
    for (let i = s.transcript.length - 1; i >= 0; i--) {
      if (s.transcript[i].role === "sous") return s.transcript[i].source === "fallback";
    }
    return false;
  });
  const interimLength = useVoice((s) => s.interim.length);
  const voiceName = usePrefs((s) => s.voiceName);
  const [sttOk] = useState(isSttSupported);
  const compact = useSyncExternalStore(subscribeResize, isCompactFrame, () => false);

  useEffect(() => {
    const v = useVoice.getState();
    if (!v.sessionActive) startSession();
    if (!isSttSupported()) v.setTyping(true);
  }, []);

  const visual: VoiceStatus = paused ? "idle" : status;
  const orbSize = hasConversation ? (compact ? 116 : 156) : compact ? 176 : 220;

  function minimize() {
    // The session keeps running; the floating orb takes over.
    const prev = getPreviousPath();
    if (prev && prev !== "/ai/talk") router.back();
    else router.push("/ai");
  }

  function hangUp() {
    endSession();
    router.push("/ai");
  }

  function tryStarter(text: string) {
    unlockAudio();
    void handleUserText(text);
  }

  // Which voice is talking: the chosen ElevenLabs voice, or the browser's backup voice.
  const voiceNote =
    status === "speaking" && !paused && ttsEngine === "browser"
      ? "backup voice"
      : voiceName
        ? `${voiceName}'s voice`
        : "ElevenLabs voice";

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-cream">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[62%] bg-[radial-gradient(ellipse_at_50%_32%,rgba(255,170,130,0.38),rgba(255,214,150,0.16)_42%,transparent_70%)]"
      />

      <header className="relative z-10 flex items-center gap-3 px-4 pb-1 pt-[calc(var(--safe-top)+14px)]">
        <IconButton label="Minimize" onClick={minimize} className="size-11 shrink-0">
          <ChevronDown className="size-5" />
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-lg font-semibold leading-tight text-ink">Sous</p>
          <p className="truncate text-xs font-medium text-ink-soft" aria-live="polite">
            <span className={cn(status !== "idle" && !paused && "text-accent-strong")}>{statusLabel(status, paused)}</span>
            <span className="text-ink-faint"> · {voiceNote}</span>
          </p>
        </div>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      <section
        className={cn(
          "relative z-10 flex shrink-0 flex-col items-center transition-[padding] duration-500",
          hasConversation ? (compact ? "pb-2 pt-3" : "pb-3 pt-6") : compact ? "pb-4 pt-6" : "pb-6 pt-12",
        )}
      >
        <Orb
          status={visual}
          size={orbSize}
          onClick={orbTap}
          activity={interimLength}
          className="transition-[width,height] duration-500 ease-out"
        />
        <p className={cn("min-h-5 text-center text-sm font-medium text-ink-soft", compact ? "mt-4" : "mt-7")}>
          {hint(visual, paused, hasConversation, sttOk)}
        </p>
        {offline && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-pill bg-butter-soft px-3 py-1 text-xs font-medium text-ink-soft animate-pop">
            <WifiOff className="size-3.5" />
            Offline mode
          </p>
        )}
      </section>

      <Transcript
        className="relative z-10 min-h-0 flex-1"
        empty={
          // min-h-full (not h-full): on short phones the starters scroll instead of clipping off the top.
          <div className="flex min-h-full flex-col items-center justify-end gap-2 py-4 animate-fade-up">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Try saying</p>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => tryStarter(s)}
                className="min-h-11 max-w-full rounded-pill border border-line bg-surface/80 px-4 text-sm font-medium text-ink-soft shadow-soft transition hover:bg-surface active:scale-[0.97]"
              >
                &ldquo;{s}&rdquo;
              </button>
            ))}
          </div>
        }
      />

      <div className="relative z-10 grid shrink-0 grid-cols-3 items-start gap-2 border-t border-line/70 bg-cream/90 px-6 pb-[calc(var(--safe-bottom)+18px)] pt-4 backdrop-blur">
        <RoundControl
          label={paused ? "Resume" : "Pause"}
          onClick={togglePause}
          icon={paused ? <Play className="size-6" /> : <Pause className="size-6" />}
          active={paused}
        />
        <RoundControl label="Type" onClick={openTyping} icon={<Keyboard className="size-6" />} />
        <RoundControl label="Hang up" tone="danger" onClick={hangUp} icon={<PhoneOff className="size-6" />} />
      </div>

      <TypeSheet />
    </div>
  );
}

function hint(status: VoiceStatus, paused: boolean, hasConversation: boolean, sttOk: boolean): string {
  if (!sttOk) return "Voice input isn't available here. Tap Type to chat.";
  if (paused) return "Paused. Tap the orb to talk again.";
  switch (status) {
    case "listening":
      return "Listening... tap the orb when you're done";
    case "thinking":
      return "Thinking it over...";
    case "speaking":
      return "Tap the orb to interrupt";
    default:
      return hasConversation ? "Tap to reply" : "Tap the orb and talk";
  }
}

function RoundControl({
  label,
  icon,
  onClick,
  tone = "neutral",
  active,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger";
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex flex-col items-center gap-1.5 justify-self-center rounded-tile focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex size-16 items-center justify-center rounded-full transition group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-cream",
          tone === "danger"
            ? "bg-danger text-white shadow-[0_12px_28px_-12px_rgb(214_69_69/0.7)]"
            : active
              ? "bg-ink text-white shadow-card"
              : "bg-surface text-ink shadow-card",
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-semibold text-ink-soft">{label}</span>
    </button>
  );
}
