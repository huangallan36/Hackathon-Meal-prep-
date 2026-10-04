"use client";

/**
 * Figma 5.x call screen "live transcript": the latest exchange large ("YOU" + what you said,
 * then the persona's name in its tint + the reply in DM Sans SemiBold 21), the contextual
 * quick actions under it, and earlier turns above it, faded (scroll up to read them). While
 * listening the "YOU" line is the live transcript; while thinking the reply is three dots.
 * Light (5.1–5.4) or dark (5.6) with the phone; in dark mode the speaker label is lemon, as
 * in the design.
 */
import { Camera, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice, type TranscriptLine } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { handleUserText, unlockAudio } from "@/lib/voice/engine";
import { usePersona, type PersonaId } from "@/lib/voice/persona";
import { useCallNav } from "./useCall";
import { useQuickActions, type QuickActionKind } from "./useCallContext";
import type { CallTheme } from "./useCallTheme";

const STARTERS = ["I'm wiped, no idea what to cook", "What can I make with eggs and mushrooms?"];

/** The first line on an empty call, in each persona's voice (shown, not spoken: they wait for you) */
const OPENERS: Record<PersonaId, (name: string) => string> = {
  maya: (name) => `Hey ${name}, long day? Let’s make something cozy.`,
  leo: (name) => `Hey ${name}. No rush. What are we cooking?`,
  nova: (name) => `Hey ${name}! What are we cooking? I’m so ready.`,
  brock: (name) => `${name}. What’s the plan? Let’s get your protein in.`,
};

/** Figma icon exports: ink on the light call (5.2), white on the dark one (5.6) */
const ICON_DIR: Record<CallTheme, string> = { light: "/figma/v2/2014-2091", dark: "/figma/v2/2014-2514" };

function ChipIcon({ kind, theme }: { kind: QuickActionKind; theme: CallTheme }) {
  if (kind === "fridge") {
    return <Camera aria-hidden className={cn("size-[14px]", theme === "dark" ? "text-white" : "text-ink")} strokeWidth={2} />;
  }
  const file = kind === "groceries" ? "icon-cart.svg" : "icon-utensils.svg";
  return <img src={`${ICON_DIR[theme]}/${file}`} alt="" width={14} height={14} className="block size-[14px]" />;
}

interface Exchange {
  /** Turns before the latest exchange */
  earlier: TranscriptLine[];
  user: string | null;
  sous: string | null;
  /** The reply came from the offline keyword router, not Gemini */
  offline?: boolean;
  /** Key that changes whenever a new exchange starts (scrolls it into place) */
  key: string;
}

function splitExchange(transcript: TranscriptLine[], listening: boolean, interim: string): Exchange {
  if (listening) return { earlier: transcript, user: interim, sous: null, key: `listen-${transcript.length}` };
  const last = transcript[transcript.length - 1];
  if (!last) return { earlier: [], user: null, sous: null, key: "empty" };
  if (last.role === "user") {
    return { earlier: transcript.slice(0, -1), user: last.text, sous: null, key: last.id };
  }
  const prev = transcript[transcript.length - 2];
  const offline = last.source === "fallback";
  if (prev?.role === "user") {
    return { earlier: transcript.slice(0, -2), user: prev.text, sous: last.text, offline, key: prev.id };
  }
  return { earlier: transcript.slice(0, -1), user: null, sous: last.text, offline, key: last.id };
}

export function LiveTranscript({ className, theme = "light" }: { className?: string; theme?: CallTheme }) {
  const transcript = useVoice((s) => s.transcript);
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const interim = useVoice((s) => s.interim);
  const persona = usePersona();
  const userName = usePrefs((s) => s.userName);
  const actions = useQuickActions();
  const { go } = useCallNav();
  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef<HTMLDivElement>(null);
  const dark = theme === "dark";
  const name = persona.name;

  const listening = status === "listening" && !paused;
  const thinking = status === "thinking" && !paused;
  const ex = splitExchange(transcript, listening, interim);
  const empty = !ex.user && !ex.sous && !thinking && !listening;

  // A new exchange: bring it to the top of the transcript area (earlier turns stay above).
  useLayoutEffect(() => {
    const el = scroller.current;
    const block = latest.current;
    if (el && block) el.scrollTo({ top: block.offsetTop, behavior: ex.earlier.length ? "smooth" : "auto" });
  }, [ex.key, ex.earlier.length]);

  // The exchange grew (the reply or its quick actions arrived): keep it pinned to the top.
  const actionKey = actions.map((a) => a.kind).join();
  useEffect(() => {
    const el = scroller.current;
    const block = latest.current;
    if (el && block && Math.abs(el.scrollTop - block.offsetTop) > 1) el.scrollTo({ top: block.offsetTop });
  }, [ex.sous, thinking, actionKey]);

  function tryStarter(text: string) {
    unlockAudio();
    void handleUserText(text);
  }

  /** The persona's name in its tint (light), lemon on black (dark, Figma 5.6) */
  const sousLabelStyle = dark ? undefined : { color: persona.tint };
  const replyClass = cn("mt-2 text-[21px] font-semibold leading-[1.32]", dark ? "text-white" : "text-ink");

  // The top 8px fade (earlier turns scroll under it) is padding above the latest exchange, so
  // "YOU" itself is never faded; the call screen pulls this area up by those 8px.
  return (
    <div
      ref={scroller}
      className={cn(
        "no-scrollbar relative overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_8px,black_calc(100%_-_10px),transparent)]",
        className,
      )}
    >
      {ex.earlier.length > 0 && (
        <ol className="flex flex-col gap-3 px-7 pb-6 pt-4" aria-label="Earlier in this call">
          {ex.earlier.map((line) => (
            <li key={line.id} className="opacity-60">
              <p
                className={cn(
                  "text-micro font-semibold uppercase tracking-[1px]",
                  line.role === "sous" ? (dark ? "text-butter" : undefined) : dark ? "text-white/50" : "text-ink/50",
                )}
                style={line.role === "sous" ? sousLabelStyle : undefined}
              >
                {line.role === "sous" ? name : "You"}
              </p>
              <p className={cn("mt-1 text-sm leading-[1.4]", dark ? "text-white/70" : "text-ink/70")}>{line.text}</p>
            </li>
          ))}
        </ol>
      )}

      {/* The latest exchange is at least as tall as the area, so it can always sit at the top */}
      <div ref={latest} className="flex min-h-full flex-col px-7 pb-3 pt-2" aria-live="polite">
        {empty ? (
          <>
            <Label tone="sous" dark={dark} style={sousLabelStyle}>
              {name}
            </Label>
            <p className={replyClass}>{OPENERS[persona.id](userName || "there")}</p>
            <div className="flex flex-wrap gap-2 pt-4">
              {STARTERS.map((s) => (
                <QuickChip key={s} dark={dark} onClick={() => tryStarter(s)}>
                  &ldquo;{s}&rdquo;
                </QuickChip>
              ))}
            </div>
          </>
        ) : (
          <>
            {ex.user !== null && (
              <>
                <Label tone="you" dark={dark}>
                  You
                </Label>
                <p
                  className={cn(
                    "mt-2 text-body leading-[1.4]",
                    listening ? (dark ? "italic text-white/55" : "italic text-ink/55") : dark ? "text-white/75" : "text-ink/75",
                  )}
                >
                  {ex.user || "Listening..."}
                </p>
              </>
            )}
            {(ex.sous || thinking) && (
              <>
                {/* Figma: 8px gap + 10px spacer + 8px gap */}
                {ex.user !== null && <span aria-hidden className="block h-[26px] shrink-0" />}
                <Label tone="sous" dark={dark} style={sousLabelStyle}>
                  {name}
                  {ex.offline && !thinking && (
                    <span
                      className={cn(
                        "ml-2 inline-flex items-center gap-1 rounded-pill px-2 py-px align-middle text-micro tracking-normal",
                        dark ? "bg-white/12 text-white/70" : "bg-ink/6 text-ink/70",
                      )}
                    >
                      <WifiOff aria-hidden className="size-3" />
                      Offline mode
                    </span>
                  )}
                </Label>
                {ex.sous && !thinking ? (
                  <p className={replyClass}>{ex.sous}</p>
                ) : (
                  <ThinkingDots label={`${name} is thinking`} dark={dark} />
                )}
              </>
            )}
            {actions.length > 0 && !listening && !thinking && (
              <div className="flex flex-wrap gap-2 pt-4">
                {actions.map((a) => (
                  <QuickChip key={a.kind} dark={dark} icon={<ChipIcon kind={a.kind} theme={theme} />} onClick={() => go(a.href)}>
                    {a.label}
                  </QuickChip>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** "YOU" (ink 50%) / the persona's name (its tint; lemon on the dark call): 11px SemiBold, 1.1px tracking */
function Label({
  tone,
  dark,
  style,
  children,
}: {
  tone: "you" | "sous";
  dark: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-caption font-semibold uppercase tracking-[1.1px]",
        tone === "sous" ? (dark ? "text-butter" : undefined) : dark ? "text-white/50" : "text-ink/50",
      )}
      style={style}
    >
      {children}
    </p>
  );
}

/** Figma quick-action pill: ink 6% (white 12% on the dark call), 14px icon, 13px label */
function QuickChip({
  icon,
  dark,
  children,
  onClick,
}: {
  icon?: ReactNode;
  dark: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-pill px-3 py-2 text-meta font-medium transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2",
        dark
          ? "bg-white/12 text-white hover:bg-white/18 focus-visible:ring-white/60"
          : "bg-ink/6 text-ink hover:bg-ink/10 focus-visible:ring-accent",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function ThinkingDots({ label, dark }: { label: string; dark: boolean }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <span role="status" aria-label={label} className="mt-4 flex h-6 items-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={cn("block size-2 rounded-full", dark ? "bg-white" : "bg-ink")}
          initial={{ opacity: 0.35 }}
          animate={reduce ? { opacity: 0.7 } : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
