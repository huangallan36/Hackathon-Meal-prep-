"use client";

/**
 * Conversation mode (hands-free) controls shared by the conversation screen, the AI home
 * settings sheet and the docked bubble. The loop itself lives in the voice engine; these
 * only flip usePrefs.handsFree through setHandsFreeMode() (inside the tap, so turning it on
 * can open the mic right away) and explain what it's doing.
 */
import { Ear } from "lucide-react";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice, type HandsFreeRest } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { setHandsFreeMode } from "@/lib/voice/engine";
import { useAssistantName } from "@/lib/voice/persona";

/** Why hands-free stopped listening by itself, phrased as what to do next */
export const REST_HINTS: Record<HandsFreeRest, string> = {
  silence: "Still there? Tap the orb to keep talking",
  stopped: "Hands-free paused · tap the orb to talk",
  blocked: "Hands-free needs a tap here · tap the orb to talk",
  error: "Hands-free stopped · tap the orb to try again",
};

export const HANDS_FREE_LIVE_HINT = "Hands-free on · just keep talking";

/** Hands-free state for hints: on/off, and why it's resting (only while on and in a session) */
export function useHandsFree(): { on: boolean; rest: HandsFreeRest | null } {
  const on = usePrefs((s) => s.handsFree);
  const rest = useVoice((s) => (s.sessionActive ? s.handsFreeRest : null));
  return { on, rest: on ? rest : null };
}

/** The visual switch track (decorative: the parent button carries role="switch") */
export function SwitchTrack({ on, dark = false, className }: { on: boolean; dark?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-pill p-[2px] transition-colors duration-200",
        on ? (dark ? "bg-live" : "bg-accent") : dark ? "bg-white/25" : "bg-line-strong",
        className,
      )}
    >
      <span
        className={cn(
          "block size-[18px] rounded-full bg-surface shadow-soft transition-transform duration-200 ease-out",
          on ? "translate-x-4" : "translate-x-0",
        )}
      />
    </span>
  );
}

/**
 * Compact pill switch: [ear] Hands-free [switch]. `dark` is the call screen's translucent
 * white-on-green version (same chips as the design's quick actions).
 */
export function HandsFreeSwitch({ dark = false, className }: { dark?: boolean; className?: string }) {
  const on = usePrefs((s) => s.handsFree);
  const name = useAssistantName();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Hands-free conversation mode"
      title={on ? `Hands-free on: ${name} listens again after talking` : "Turn on hands-free: no tap needed between turns"}
      onClick={() => setHandsFreeMode(!on)}
      className={cn(
        // 34px pill; the ::after keeps a 44px tap target
        "relative inline-flex h-[34px] items-center gap-2 rounded-pill pl-3 pr-[6px] text-meta font-medium transition active:scale-[0.97]",
        "after:absolute after:-inset-y-[5px] after:inset-x-0 after:content-['']",
        dark
          ? "bg-white/12 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          : "shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        !dark && (on ? "bg-accent-soft text-accent-strong" : "bg-surface/90 text-ink-soft"),
        className,
      )}
    >
      <Ear
        aria-hidden
        className={cn("size-[14px]", dark ? (on ? "text-live" : "text-white/70") : on ? "text-accent" : "text-ink-faint")}
        strokeWidth={2.2}
      />
      Hands-free
      <SwitchTrack on={on} dark={dark} />
    </button>
  );
}

/** Full-width settings row: title, one-line explanation, switch */
export function HandsFreeSettingRow({ className }: { className?: string }) {
  const on = usePrefs((s) => s.handsFree);
  const name = useAssistantName();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setHandsFreeMode(!on)}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-tile text-left transition active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        <Ear aria-hidden className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">Hands-free conversation</span>
        <span className="block text-xs leading-snug text-ink-soft">
          {name} listens again after talking, so you don&apos;t need to tap between turns.
        </span>
      </span>
      <SwitchTrack on={on} />
    </button>
  );
}
