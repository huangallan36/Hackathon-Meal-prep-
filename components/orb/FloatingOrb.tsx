"use client";

/**
 * The always-there tap-to-talk orb (rendered by AppShell on every screen).
 * Also the voice engine's bridge to the router: it registers router.push and keeps the
 * engine's notion of the current screen fresh, so it stays mounted even where hidden.
 */
import { Maximize2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusGlyph, statusLabel } from "@/components/voice/StatusGlyph";
import { TypeSheet } from "@/components/voice/TypeSheet";
import { useVoice } from "@/lib/stores/voice";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { setCurrentPath } from "@/lib/voice/context";
import { orbTap, setNavigator } from "@/lib/voice/engine";
import { Orb } from "./Orb";

/** The AI home has its own hero orb; the conversation screen is the orb. */
const HIDDEN_ON = new Set(["/ai", "/ai/talk"]);
const CAPTION_MS = 6000;

export function FloatingOrb() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setNavigator((href) => router.push(href));
  }, [router]);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const sessionActive = useVoice((s) => s.sessionActive);
  const interim = useVoice((s) => s.interim);
  const caption = useVoice((s) => s.caption);
  const captionAt = useVoice((s) => s.captionAt);

  // Captions fade ~6s after Sous finishes talking.
  const [expiredAt, setExpiredAt] = useState(0);
  useEffect(() => {
    if (!captionAt || status === "speaking") return;
    const t = setTimeout(() => setExpiredAt(captionAt), CAPTION_MS);
    return () => clearTimeout(t);
  }, [captionAt, status]);

  const visual: VoiceStatus = paused ? "idle" : status;
  const showCaption = sessionActive && (visual !== "idle" || paused || (!!caption && captionAt !== expiredAt));
  const hidden = HIDDEN_ON.has(pathname);

  return (
    <>
      {!hidden && (
        <div
          className="pointer-events-none fixed left-4 right-4 z-[45] flex items-end justify-end gap-2"
          style={{ bottom: "calc(var(--nav-height) + var(--safe-bottom) + 14px)" }}
        >
          <AnimatePresence>
            {showCaption && (
              <CaptionBubble
                key="caption"
                status={visual}
                paused={paused}
                interim={interim}
                caption={caption}
                onExpand={() => router.push("/ai/talk")}
              />
            )}
          </AnimatePresence>
          <motion.div
            className="pointer-events-auto"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 260 }}
          >
            <Orb size={60} status={visual} onClick={orbTap} activity={interim.length}>
              <StatusGlyph status={visual} />
            </Orb>
          </motion.div>
        </div>
      )}
      {pathname !== "/ai/talk" && <TypeSheet />}
    </>
  );
}

function CaptionBubble({
  status,
  paused,
  interim,
  caption,
  onExpand,
}: {
  status: VoiceStatus;
  paused: boolean;
  interim: string;
  caption: string | null;
  onExpand: () => void;
}) {
  const lastUserLine = useVoice((s) => {
    for (let i = s.transcript.length - 1; i >= 0; i--) if (s.transcript[i].role === "user") return s.transcript[i].text;
    return "";
  });
  const listening = status === "listening";
  const thinking = status === "thinking";
  const text = listening
    ? interim || "Go ahead, I'm listening."
    : thinking
      ? lastUserLine
        ? `“${lastUserLine}”`
        : "One sec..."
      : caption || "Tap the orb to talk.";
  const label = paused ? "Paused" : status === "idle" || status === "speaking" ? "Sous" : statusLabel(status, false);

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
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-accent">
          <span
            className={cn(
              "size-1.5 rounded-full bg-accent",
              (listening || thinking) && !paused && "animate-pulse",
              paused && "bg-ink-faint",
            )}
          />
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink",
            (listening || thinking) && "italic text-ink-soft",
          )}
        >
          {text}
        </span>
      </span>
      <Maximize2 aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-faint" />
    </motion.button>
  );
}
