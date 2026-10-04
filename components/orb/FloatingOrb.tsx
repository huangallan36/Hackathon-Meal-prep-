"use client";

/**
 * The floating call button (rendered by AppShell on every screen): the chosen persona's mascot
 * avatar (design rules: the AI's face wherever it speaks), with rings in its tint that follow
 * the voice, and a caption beside it with what's being heard or said. Tap = tap-to-talk; the
 * caption opens the call; long-press docks Sous as a bubble over the (simulated) phone home
 * screen.
 * Design v1 has no floating voice button: every screen has its own voice entry (Home's Start
 * talking, the planner's search mic, the diary's log button, cooking's hands-free bar), and a
 * mascot must never sit over photos or data-dense views. So it only shows while a call is
 * running, as the way back to it from other screens (fixed bottom-right, 14px above the tab bar).
 * Also the voice engine's bridge to the router: it registers router.push and keeps the
 * engine's notion of the current screen fresh, so it stays mounted even where hidden.
 */
import { Maximize2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { TypeSheet } from "@/components/voice/TypeSheet";
import { useDock } from "@/lib/stores/dock";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { setCurrentPath } from "@/lib/voice/context";
import { orbTap, setNavigator } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";
import { useOrbCaption, type OrbCaption } from "./useOrbCaption";
import { VoiceAvatar } from "./VoiceAvatar";

/** The AI home has its own Start button; the call screen is the call; cooking mode has its own mic bar. */
function hiddenOn(pathname: string): boolean {
  return pathname === "/ai" || pathname === "/ai/talk" || pathname.startsWith("/ai/cook/");
}
/** Hold this long (without moving) to dock Sous */
const LONG_PRESS_MS = 550;
const MOVE_TOLERANCE_PX = 10;

export function FloatingOrb() {
  const router = useRouter();
  const pathname = usePathname();
  const docked = useDock((s) => s.docked);
  const live = useVoice((s) => s.sessionActive);

  useEffect(() => {
    setNavigator((href) => router.push(href));
  }, [router]);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  // The feed's Skip / Yum buttons sit where the caption would be: there, only show it while Sous is listening or thinking.
  const caption = useOrbCaption(pathname === "/social");
  const longPress = useLongPress(() => useDock.getState().dock());
  const hidden = hiddenOn(pathname) || docked || !live;

  return (
    <>
      {!hidden && (
        <div
          className="pointer-events-none fixed left-4 right-4 z-[45] flex items-end justify-end gap-2"
          style={{ bottom: "calc(var(--nav-height) + var(--safe-bottom) + 14px)" }}
        >
          <AnimatePresence>
            {caption.show && <CaptionBubble key="caption" caption={caption} onExpand={() => router.push("/ai/talk")} />}
          </AnimatePresence>
          <motion.div
            className="pointer-events-auto select-none [-webkit-touch-callout:none]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 260 }}
            {...longPress}
          >
            <VoiceAvatar size={60} status={caption.visual} onClick={orbTap} floating />
          </motion.div>
        </div>
      )}
      {pathname !== "/ai/talk" && <TypeSheet />}
    </>
  );
}

/**
 * Pointer handlers for a long-press that swallows the click it would otherwise end in.
 * Spread onto a wrapper around the orb button.
 */
function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }

  useEffect(() => {
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);

  return {
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      clear();
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        try {
          navigator.vibrate?.(12);
        } catch {
          /* optional */
        }
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE_PX) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    onClickCapture: (e: ReactMouseEvent) => {
      // The long-press already docked Sous: this click must not also start listening.
      if (fired.current) {
        fired.current = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
}

/** The line beside the button; the persona's name (and its dot) in the persona's tint */
function CaptionBubble({ caption, onExpand }: { caption: OrbCaption; onExpand: () => void }) {
  const { label, text, live, paused } = caption;
  const persona = usePersona();
  return (
    <motion.button
      type="button"
      onClick={onExpand}
      aria-label="Open the conversation"
      initial={{ opacity: 0, x: 14, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 10, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ type: "spring", damping: 24, stiffness: 320 }}
      className="pointer-events-auto mb-2 flex min-h-11 min-w-0 max-w-[244px] items-start gap-2 rounded-[20px] rounded-br-md bg-surface/95 px-3.5 py-2.5 text-left shadow-lift ring-1 ring-line backdrop-blur"
    >
      <span className="min-w-0 flex-1">
        <span
          className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: persona.tint }}
        >
          <span
            className={cn("size-1.5 rounded-full", live && !paused && "animate-pulse", paused ? "bg-ink-faint" : "bg-current")}
          />
          {label}
        </span>
        <span className={cn("mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink", live && "italic text-ink-soft")}>
          {text}
        </span>
      </span>
      <Maximize2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
    </motion.button>
  );
}
