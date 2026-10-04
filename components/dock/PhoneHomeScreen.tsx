"use client";

/**
 * A pretend phone home screen, drawn inside the phone frame while Sous is docked, to show
 * how Sous would live as a floating bubble over other apps (a web page can't really do that).
 * Generic app tiles only; they just bounce when tapped. The Sous tile and Escape go back
 * to the app; the bubble opens the conversation. While a call is running, a Live Activity
 * card (persona, live step, pause / type / end) sits above the dock.
 */
import {
  BookOpen,
  Calculator,
  CalendarDays,
  Camera,
  Clock,
  CloudSun,
  Folder,
  HeartPulse,
  Images,
  ListTodo,
  Mail,
  Map as MapGlyph,
  MessageCircle,
  Music,
  Phone,
  Radio,
  Settings,
  StickyNote,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDock } from "@/lib/stores/dock";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { endSession, unlockAudio } from "@/lib/voice/engine";
import { usePersona } from "@/lib/voice/persona";
import { LiveActivity } from "./LiveActivity";
import { SousBubble } from "./SousBubble";

/* Wallpaper and app tiles are the one place raw colors are allowed: brand green -> amber glow. */
const WALLPAPER = [
  "radial-gradient(120% 62% at 88% 104%, rgba(247,207,122,0.92) 0%, rgba(233,169,58,0.62) 24%, rgba(224,96,58,0.3) 46%, rgba(224,96,58,0) 66%)",
  "radial-gradient(85% 50% at 4% 6%, rgba(123,216,143,0.22) 0%, rgba(123,216,143,0) 62%)",
  "linear-gradient(172deg, #10221a 0%, #183528 32%, #24493a 58%, #3b4a2b 80%, #6a4a1e 100%)",
].join(", ");

interface App {
  name: string;
  icon: LucideIcon;
  bg: string;
}

const tile = (from: string, to: string) => `linear-gradient(180deg, ${from}, ${to})`;

const GRID_APPS: App[] = [
  { name: "Calendar", icon: CalendarDays, bg: tile("#ff7b6e", "#e3463c") },
  { name: "Photos", icon: Images, bg: tile("#ffbe76", "#f2793f") },
  { name: "Camera", icon: Camera, bg: tile("#8d929b", "#585d66") },
  { name: "Maps", icon: MapGlyph, bg: tile("#72d391", "#2e9c5a") },
  { name: "Weather", icon: CloudSun, bg: tile("#6fbaff", "#2f7be0") },
  { name: "Clock", icon: Clock, bg: tile("#43464e", "#17191d") },
  { name: "Notes", icon: StickyNote, bg: tile("#ffd873", "#f0ae35") },
  { name: "Files", icon: Folder, bg: tile("#5daaff", "#2c6bd3") },
  { name: "Wallet", icon: Wallet, bg: tile("#33363d", "#101114") },
  { name: "Podcasts", icon: Radio, bg: tile("#c37dff", "#8740de") },
  { name: "Health", icon: HeartPulse, bg: tile("#ff8ca6", "#ee466c") },
  { name: "Settings", icon: Settings, bg: tile("#a6abb3", "#6a6f77") },
  { name: "Calculator", icon: Calculator, bg: tile("#ffa45e", "#ee6c28") },
  { name: "Reminders", icon: ListTodo, bg: tile("#8190ff", "#4a59df") },
  { name: "Books", icon: BookOpen, bg: tile("#ffb24d", "#ec861a") },
];

const DOCK_APPS: App[] = [
  { name: "Phone", icon: Phone, bg: tile("#6fdc7c", "#2fb24a") },
  { name: "Messages", icon: MessageCircle, bg: tile("#68e07d", "#22a94a") },
  { name: "Mail", icon: Mail, bg: tile("#62b4ff", "#2470e0") },
  { name: "Music", icon: Music, bg: tile("#ff7a8f", "#ec3b58") },
];

/** Apps shown above the live activity card (3 rows with the Sous tile) */
const GRID_WITH_ACTIVITY = 11;

export function PhoneHomeScreen() {
  const ref = useRef<HTMLElement>(null);
  const restZone = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const present = useIsPresent();
  const live = useVoice((s) => s.sessionActive);
  const apps = live ? GRID_APPS.slice(0, GRID_WITH_ACTIVITY) : GRID_APPS;

  // Escape = back to the app (the type sheet, if open, closes first).
  useEffect(() => {
    if (!present) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (useVoice.getState().typing) return;
      useDock.getState().undock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present]);

  function hangUp() {
    endSession();
    router.push("/ai");
    useDock.getState().undock();
  }

  function openCall() {
    unlockAudio();
    router.push("/ai/talk");
    useDock.getState().undock();
  }

  return (
    <motion.section
      ref={ref}
      aria-label="Phone home screen (demo) with Sous floating"
      aria-hidden={!present || undefined}
      // While it fades out the app underneath is already live: don't swallow taps meant for it.
      className={cn("absolute inset-0 z-[48] select-none overflow-hidden", !present && "pointer-events-none")}
      style={{ background: WALLPAPER }}
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.22 } }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-full flex-col px-4 pb-[calc(var(--safe-bottom)+10px)] pt-[calc(var(--safe-top)+22px)]">
        <ul className="grid grid-cols-4 gap-y-[18px]" aria-label="Apps">
          {apps.map((app, i) => (
            <li key={app.name} className="flex justify-center">
              <AppIcon app={app} index={i} />
            </li>
          ))}
          <li className="flex justify-center">
            <SousTile index={apps.length} />
          </li>
        </ul>

        {/* Plain wallpaper between the apps and the dock: where the bubble rests by default */}
        <div ref={restZone} aria-hidden className="min-h-4 flex-1" />

        {live && <LiveActivity onOpen={openCall} onEnd={hangUp} className="mb-4 animate-fade-up" />}

        <div className="flex justify-center gap-2 pb-3" aria-hidden>
          <span className="size-[7px] rounded-full bg-white" />
          <span className="size-[7px] rounded-full bg-white/40" />
        </div>

        <ul
          aria-label="Dock"
          className="grid grid-cols-4 rounded-[30px] bg-white/20 px-2 py-3 ring-1 ring-white/15 backdrop-blur-xl"
        >
          {DOCK_APPS.map((app) => (
            <li key={app.name} className="flex justify-center">
              <AppIcon app={app} bare />
            </li>
          ))}
        </ul>
      </div>

      <SousBubble containerRef={ref} restZoneRef={restZone} />

      {/* Keyboard / screen reader way out (dragging to End is pointer-only) */}
      <button
        type="button"
        onClick={hangUp}
        className="sr-only focus:not-sr-only focus:absolute focus:bottom-[calc(var(--safe-bottom)+120px)] focus:left-1/2 focus:z-30 focus:-translate-x-1/2 focus:rounded-pill focus:bg-surface focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lift"
      >
        End Sous session
      </button>
    </motion.section>
  );
}

/** One generic app: rounded tile, white glyph, label. Tapping just bounces it. */
function AppIcon({ app, index = 0, bare = false }: { app: App; index?: number; bare?: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const [taps, setTaps] = useState(0);
  const Icon = app.icon;
  return (
    <motion.button
      type="button"
      aria-label={`${app.name} (demo app)`}
      onClick={() => setTaps((n) => n + 1)}
      className="flex w-[72px] flex-col items-center gap-1.5 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { delay: 0.04 + index * 0.012, type: "spring", stiffness: 420, damping: 28 },
      }}
    >
      <motion.span
        key={taps}
        className="flex size-[60px] items-center justify-center rounded-[16px] shadow-[0_6px_14px_-8px_rgb(0_0_0/0.55)]"
        style={{ background: app.bg }}
        animate={taps && !reduce ? { scale: [1, 0.86, 1.07, 1] } : undefined}
        transition={{ duration: 0.42, ease: "easeOut" }}
      >
        <Icon aria-hidden className="size-[30px] text-white" strokeWidth={1.9} />
      </motion.span>
      {!bare && (
        <span className="max-w-full truncate text-[11px] font-medium leading-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">
          {app.name}
        </span>
      )}
    </motion.button>
  );
}

/** Sous's own app icon: opens the app again (where you left it). */
function SousTile({ index }: { index: number }) {
  const reduce = useReducedMotion() ?? false;
  const persona = usePersona();
  return (
    <motion.button
      type="button"
      aria-label="Open the Sous app"
      onClick={() => useDock.getState().undock()}
      className="flex w-[72px] flex-col items-center gap-1.5 rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { delay: 0.04 + index * 0.012, type: "spring", stiffness: 420, damping: 28 },
      }}
      whileTap={reduce ? undefined : { scale: 0.9 }}
    >
      <span className="flex size-[60px] items-center justify-center rounded-[16px] bg-cream shadow-[0_6px_14px_-8px_rgb(0_0_0/0.55)]">
        <img src={persona.orb} alt="" width={40} height={40} className="size-10" />
      </span>
      <span className="max-w-full truncate text-[11px] font-medium leading-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.45)]">
        Sous
      </span>
    </motion.button>
  );
}
