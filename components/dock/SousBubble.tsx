"use client";

/**
 * Sous as a chat-head bubble over the (simulated) phone home screen.
 * - Drag anywhere; on release it springs to the nearest side edge and remembers its height.
 * - Tap opens the conversation (undocks). The small mic badge is tap-to-talk without leaving.
 * - While dragging, an "End" target appears at the bottom: dropping Sous there hangs up.
 * - Reflects the voice status (listening rings, speaking pulse, thinking swirl) and shows the
 *   live transcript / latest Sous line beside itself for a few seconds.
 */
import { Mic, X } from "lucide-react";
import {
  animate,
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
  type PanInfo,
} from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import { Orb } from "@/components/orb/Orb";
import { useOrbCaption } from "@/components/orb/useOrbCaption";
import { StatusGlyph } from "@/components/voice/StatusGlyph";
import { useDock, type DockSide } from "@/lib/stores/dock";
import { cn } from "@/lib/utils";
import { endSession, orbTap, unlockAudio } from "@/lib/voice/engine";

const SIZE = 64;
/** Gap between the resting bubble and the phone's side edge */
const EDGE = 10;
/** Dropping the bubble's center this close to the End target hangs up */
const DISMISS_RADIUS = 62;
/** First-dock coach line ("Drag me anywhere") */
const COACH_MS = 4500;
const SPRING = { type: "spring", stiffness: 520, damping: 34, mass: 0.9 } as const;

interface Bounds {
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Center of the End target */
  targetX: number;
  targetY: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function measure(el: HTMLElement, safeTop: number, safeBottom: number): Bounds {
  const width = el.clientWidth;
  const height = el.clientHeight;
  const minY = safeTop + 8;
  return {
    width,
    height,
    minX: EDGE,
    maxX: Math.max(EDGE, width - SIZE - EDGE),
    minY,
    maxY: Math.max(minY, height - safeBottom - SIZE - 14),
    targetX: width / 2,
    targetY: height - safeBottom - 70,
  };
}

export function SousBubble({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const caption = useOrbCaption();
  const controls = useDragControls();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [side, setSide] = useState<DockSide>(() => useDock.getState().side);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(false);
  const [coach, setCoach] = useState(true);

  const probeTop = useRef<HTMLSpanElement>(null);
  const probeBottom = useRef<HTMLSpanElement>(null);
  const boundsRef = useRef<Bounds | null>(null);
  const draggingRef = useRef(false);
  const armedRef = useRef(false);
  /** The pointer moved enough to count as a drag: the click that follows is not a tap */
  const movedRef = useRef(false);
  const endingRef = useRef(false);
  /** Pending hang-up after the drop animation; run right away if we unmount first */
  const endRef = useRef<{ timer: ReturnType<typeof setTimeout>; run: () => void } | null>(null);
  const snapRef = useRef<AnimationPlaybackControls[]>([]);

  // Measure the phone (and its safe areas) and place the bubble at its remembered spot.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const place = () => {
      const b = measure(el, probeTop.current?.offsetHeight ?? 0, probeBottom.current?.offsetHeight ?? 0);
      boundsRef.current = b;
      setBounds(b);
      if (draggingRef.current || endingRef.current) return;
      const saved = useDock.getState();
      x.set(saved.side === "left" ? b.minX : b.maxX);
      // Default spot: just under the app grid, over plain wallpaper.
      y.set(clamp(saved.y ?? b.minY + (b.maxY - b.minY) * 0.62, b.minY, b.maxY));
    };
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, x, y]);

  useEffect(() => {
    const t = setTimeout(() => setCoach(false), COACH_MS);
    const snaps = snapRef;
    const ending = endRef;
    return () => {
      clearTimeout(t);
      for (const a of snaps.current) a.stop();
      // Dropped on End but unmounted mid-animation (e.g. Escape): still hang up.
      const pending = ending.current;
      if (pending) {
        clearTimeout(pending.timer);
        pending.run();
      }
    };
  }, []);

  function stopSnap() {
    for (const a of snapRef.current) a.stop();
    snapRef.current = [];
  }

  function overTarget(b: Bounds): boolean {
    const cx = x.get() + SIZE / 2;
    const cy = y.get() + SIZE / 2;
    return Math.hypot(cx - b.targetX, cy - b.targetY) < DISMISS_RADIUS;
  }

  function onDragStart() {
    movedRef.current = true;
    draggingRef.current = true;
    stopSnap();
    setDragging(true);
    setCoach(false);
  }

  function onDrag() {
    const b = boundsRef.current;
    if (!b) return;
    const over = overTarget(b);
    if (over === armedRef.current) return;
    armedRef.current = over;
    setArmed(over);
    if (over) {
      try {
        navigator.vibrate?.(10);
      } catch {
        /* optional */
      }
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    draggingRef.current = false;
    setDragging(false);
    const b = boundsRef.current;
    if (!b) return;
    if (armedRef.current) {
      armedRef.current = false;
      setArmed(false);
      dismiss(b);
      return;
    }
    // Fling toward a side, or settle on the nearer one.
    const vx = info.velocity.x;
    const right = Math.abs(vx) > 450 ? vx > 0 : x.get() + SIZE / 2 > b.width / 2;
    const tx = right ? b.maxX : b.minX;
    const ty = clamp(y.get(), b.minY, b.maxY);
    const nextSide: DockSide = right ? "right" : "left";
    setSide(nextSide);
    useDock.getState().setBubble(nextSide, ty);
    stopSnap();
    if (reduce) {
      x.set(tx);
      y.set(ty);
    } else {
      snapRef.current = [animate(x, tx, SPRING), animate(y, ty, SPRING)];
    }
  }

  /** Dropped on End: slide into the target, hang up, and go back to the app's home. */
  function dismiss(b: Bounds) {
    if (endingRef.current) return;
    endingRef.current = true;
    stopSnap();
    const run = () => {
      endRef.current = null;
      try {
        endSession();
      } catch (err) {
        console.warn("[dock] hang up failed:", err instanceof Error ? err.message : err);
      }
      router.push("/ai");
      useDock.getState().undock();
    };
    if (reduce) {
      run();
      return;
    }
    snapRef.current = [
      animate(x, b.targetX - SIZE / 2, { duration: 0.16 }),
      animate(y, b.targetY - SIZE / 2, { duration: 0.16 }),
    ];
    endRef.current = { timer: setTimeout(run, 190), run };
  }

  /** Tap: open the conversation. A click that ends a drag isn't a tap (keyboard clicks always are). */
  function open(e: ReactMouseEvent) {
    if (endingRef.current || (movedRef.current && e.detail !== 0)) return;
    unlockAudio();
    router.push("/ai/talk");
    useDock.getState().undock();
  }

  const showCaption = !dragging && (caption.show || coach);
  const captionMaxWidth = bounds ? Math.max(120, Math.min(232, bounds.width - SIZE - EDGE * 2 - 24)) : 232;
  const captionLabel = caption.show ? caption.label : "Sous";
  const captionText = caption.show ? caption.text : "Drag me anywhere · tap to open";
  const listening = caption.visual === "listening";

  return (
    <>
      {/* Safe-area probes: CSS env() can't be read from JS directly */}
      <span ref={probeTop} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 h-[var(--safe-top)] w-px" />
      <span
        ref={probeBottom}
        aria-hidden
        className="pointer-events-none invisible absolute bottom-0 left-0 h-[var(--safe-bottom)] w-px"
      />

      {/* Scrim + End target, only while dragging (keyboard users have the End button in the overlay) */}
      <AnimatePresence>
        {dragging && bounds && (
          <motion.div
            key="end-scrim"
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-60 bg-gradient-to-t from-ink/60 via-ink/25 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
          />
        )}
        {dragging && bounds && (
          <motion.div
            key="end-target"
            aria-hidden
            className="pointer-events-none absolute z-10 flex w-20 flex-col items-center gap-1.5"
            style={{ left: bounds.targetX - 40, top: bounds.targetY - 28 }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: armed ? 1.18 : 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 480, damping: 26 }}
          >
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-full text-white ring-1 backdrop-blur-md transition-colors",
                armed ? "bg-flame ring-white/50" : "bg-ink/45 ring-white/30",
              )}
            >
              <X className="size-6" strokeWidth={2.4} />
            </span>
            <span className="text-caption font-semibold text-white drop-shadow">End</span>
          </motion.div>
        )}
      </AnimatePresence>

      {bounds && (
        <motion.div
          drag
          dragControls={controls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.16}
          dragConstraints={{ left: bounds.minX, right: bounds.maxX, top: bounds.minY, bottom: bounds.maxY }}
          onDragStart={onDragStart}
          onDrag={onDrag}
          onDragEnd={onDragEnd}
          onPointerDown={(e) => {
            if (endingRef.current) return;
            movedRef.current = false;
            controls.start(e);
          }}
          className="absolute left-0 top-0 z-20 touch-none select-none [-webkit-touch-callout:none]"
          style={{ x, y, width: SIZE, height: SIZE }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: dragging ? 1.08 : 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          <button
            type="button"
            onClick={open}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Open Sous conversation"
            title="Open Sous (drag to move, drop on End to hang up)"
            className="relative block size-full rounded-full shadow-lift outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          >
            <Orb size={SIZE} status={caption.visual} activity={caption.interim.length}>
              {/* The mic badge already says "talk": the orb only shows thinking dots / speaking bars */}
              {(caption.visual === "thinking" || caption.visual === "speaking") && (
                <StatusGlyph status={caption.visual} size={22} />
              )}
            </Orb>
          </button>

          {/* Tap-to-talk without leaving the home screen */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => orbTap()}
            aria-label={
              listening
                ? "Done talking"
                : caption.visual === "speaking"
                  ? "Interrupt and talk to Sous"
                  : caption.visual === "thinking"
                    ? "Sous is thinking"
                    : "Talk to Sous"
            }
            className={cn(
              "absolute -bottom-1 flex size-[26px] items-center justify-center rounded-full ring-2 ring-white/90 transition active:scale-90",
              "after:absolute after:-inset-[9px] after:rounded-full after:content-['']",
              "focus-visible:outline-none focus-visible:ring-white",
              side === "right" ? "-left-1" : "-right-1",
              listening ? "bg-flame text-white" : "bg-surface text-flame shadow-soft",
            )}
          >
            {listening && !reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-flame"
                animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <Mic aria-hidden className="relative size-3.5" strokeWidth={2.6} />
          </button>

          <AnimatePresence>
            {showCaption && (
              <motion.button
                key="bubble-caption"
                type="button"
                onClick={open}
                aria-label={`${captionLabel}: ${captionText}. Open the conversation`}
                initial={{ opacity: 0, x: side === "right" ? 10 : -10, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.18 } }}
                transition={{ type: "spring", damping: 24, stiffness: 320 }}
                style={{ maxWidth: captionMaxWidth }}
                className={cn(
                  "absolute top-1/2 flex min-h-11 w-max -translate-y-1/2 flex-col justify-center rounded-[18px] bg-surface/95 px-3.5 py-2 text-left shadow-lift ring-1 ring-line backdrop-blur",
                  side === "right" ? "right-[calc(100%+10px)] rounded-r-md" : "left-[calc(100%+10px)] rounded-l-md",
                )}
              >
                <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent">
                  <span
                    className={cn(
                      "size-1.5 rounded-full bg-accent",
                      caption.live && "animate-pulse",
                      caption.paused && "bg-ink-faint",
                    )}
                  />
                  {captionLabel}
                </span>
                <span
                  className={cn(
                    "mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink",
                    caption.show && caption.live && "italic text-ink-soft",
                  )}
                  aria-live="polite"
                >
                  {captionText}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
