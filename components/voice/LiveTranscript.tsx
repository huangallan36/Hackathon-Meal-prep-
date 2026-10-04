"use client";

/**
 * Figma 1.2 "live transcript" on the dark call screen: the latest exchange large
 * ("YOU" + what you said, then the persona's name in amber + the reply in Fraunces 22),
 * the contextual quick actions under it, and earlier turns above it, faded (scroll up to
 * read them). While listening the "YOU" line is the live transcript; while thinking the
 * reply is three dots.
 */
import { Camera, WifiOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice, type TranscriptLine } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { handleUserText, unlockAudio } from "@/lib/voice/engine";
import { useAssistantName } from "@/lib/voice/persona";
import { useCallNav } from "./useCall";
import { useQuickActions, type QuickActionKind } from "./useCallContext";

const STARTERS = ["I'm wiped, no idea what to cook", "What can I make with eggs and mushrooms?"];

const ICONS: Record<QuickActionKind, ReactNode> = {
  recipe: <img src="/figma/screens/2-139/icon-utensils.svg" alt="" width={14} height={14} className="block size-[14px]" />,
  recipes: <img src="/figma/screens/2-139/icon-utensils.svg" alt="" width={14} height={14} className="block size-[14px]" />,
  groceries: <img src="/figma/screens/2-139/icon-cart.svg" alt="" width={14} height={14} className="block size-[14px]" />,
  fridge: <Camera aria-hidden className="size-[14px] text-white" strokeWidth={2} />,
};

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

export function LiveTranscript({ className }: { className?: string }) {
  const transcript = useVoice((s) => s.transcript);
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const interim = useVoice((s) => s.interim);
  const name = useAssistantName();
  const userName = usePrefs((s) => s.userName);
  const actions = useQuickActions();
  const { go } = useCallNav();
  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={scroller}
      className={cn(
        "no-scrollbar relative overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_18px,black_calc(100%_-_10px),transparent)]",
        className,
      )}
    >
      {ex.earlier.length > 0 && (
        <ol className="flex flex-col gap-3 px-7 pb-6 pt-4" aria-label="Earlier in this call">
          {ex.earlier.map((line) => (
            <li key={line.id} className="opacity-60">
              <p className={cn("text-micro font-semibold uppercase tracking-[1px]", line.role === "sous" ? "text-butter" : "text-white/50")}>
                {line.role === "sous" ? name : "You"}
              </p>
              <p className="mt-1 text-sm leading-[1.4] text-white/70">{line.text}</p>
            </li>
          ))}
        </ol>
      )}

      {/* The latest exchange is at least as tall as the area, so it can always sit at the top */}
      <div ref={latest} className="flex min-h-full flex-col px-7 pb-3 pt-2" aria-live="polite">
        {empty ? (
          <>
            <Label tone="sous">{name}</Label>
            <p className="mt-2 font-display text-heading font-normal leading-[1.3] text-white">
              Hey {userName || "there"}, what are we cooking? Tap the orb and tell me.
            </p>
            <div className="flex flex-wrap gap-2 pt-4">
              {STARTERS.map((s) => (
                <QuickChip key={s} onClick={() => tryStarter(s)}>
                  &ldquo;{s}&rdquo;
                </QuickChip>
              ))}
            </div>
          </>
        ) : (
          <>
            {ex.user !== null && (
              <>
                <Label tone="you">You</Label>
                <p className={cn("mt-2 text-body leading-[1.4]", listening ? "italic text-white/55" : "text-white/75")}>
                  {ex.user || "Listening..."}
                </p>
              </>
            )}
            {(ex.sous || thinking) && (
              <>
                {/* Figma: 8px gap + 10px spacer + 8px gap */}
                {ex.user !== null && <span aria-hidden className="block h-[26px] shrink-0" />}
                <Label tone="sous">
                  {name}
                  {ex.offline && !thinking && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-pill bg-white/12 px-2 py-px align-middle text-micro tracking-normal text-white/70">
                      <WifiOff aria-hidden className="size-3" />
                      Offline mode
                    </span>
                  )}
                </Label>
                {ex.sous && !thinking ? (
                  <p className="mt-2 font-display text-heading font-normal leading-[1.3] text-white">{ex.sous}</p>
                ) : (
                  <ThinkingDots label={`${name} is thinking`} />
                )}
              </>
            )}
            {actions.length > 0 && !listening && !thinking && (
              <div className="flex flex-wrap gap-2 pt-4">
                {actions.map((a) => (
                  <QuickChip key={a.kind} icon={ICONS[a.kind]} onClick={() => go(a.href)}>
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

function Label({ tone, children }: { tone: "you" | "sous"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "text-caption font-semibold uppercase tracking-[1.1px]",
        tone === "sous" ? "text-butter" : "text-white/50",
      )}
    >
      {children}
    </p>
  );
}

/** Figma quick-action pill: white/12, 14px icon, 13px white label */
function QuickChip({ icon, children, onClick }: { icon?: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-white/12 px-3 py-2 text-meta font-medium text-white transition hover:bg-white/18 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function ThinkingDots({ label }: { label: string }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <span role="status" aria-label={label} className="mt-4 flex h-6 items-center gap-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-2 rounded-full bg-white"
          initial={{ opacity: 0.35 }}
          animate={reduce ? { opacity: 0.7 } : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
