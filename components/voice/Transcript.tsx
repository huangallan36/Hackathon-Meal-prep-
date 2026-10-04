"use client";

import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { useVoice, type TranscriptLine } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";

/** Live conversation: user bubbles right, Sous bubbles left, interim speech in italics. */
export function Transcript({ className, empty }: { className?: string; empty?: ReactNode }) {
  const transcript = useVoice((s) => s.transcript);
  const interim = useVoice((s) => s.interim);
  const status = useVoice((s) => s.status);
  const scroller = useRef<HTMLDivElement>(null);

  const showInterim = status === "listening" && !!interim;
  const showThinking = status === "thinking";

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcript.length, interim, showThinking]);

  const isEmpty = !transcript.length && !showInterim && !showThinking;

  return (
    <div
      ref={scroller}
      className={cn(
        "no-scrollbar overflow-y-auto overscroll-contain px-5 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%_-_12px),transparent)]",
        className,
      )}
    >
      {isEmpty ? (
        empty
      ) : (
        <div className="flex min-h-full flex-col justify-end gap-2.5 py-4" aria-live="polite" aria-relevant="additions">
          {transcript.map((line) => (
            <Bubble key={line.id} line={line} />
          ))}
          {showInterim && (
            <p className="max-w-[82%] self-end rounded-[20px] rounded-br-md border border-dashed border-accent/35 bg-accent-soft/50 px-4 py-2.5 text-[15px] italic leading-snug text-ink-soft">
              {interim}
            </p>
          )}
          {showThinking && <ThinkingBubble />}
        </div>
      )}
    </div>
  );
}

function Bubble({ line }: { line: TranscriptLine }) {
  const mine = line.role === "user";
  return (
    <p
      className={cn(
        "max-w-[86%] whitespace-pre-line px-4 py-2.5 text-[15px] leading-snug text-ink animate-fade-up",
        mine
          ? "self-end rounded-[20px] rounded-br-md bg-accent-soft"
          : "self-start rounded-[20px] rounded-bl-md bg-surface shadow-soft",
      )}
    >
      {line.text}
    </p>
  );
}

function ThinkingBubble() {
  return (
    <span
      role="status"
      aria-label="Sous is thinking"
      className="flex items-center gap-1.5 self-start rounded-[20px] rounded-bl-md bg-surface px-4 py-3.5 shadow-soft animate-fade-up"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block size-2 rounded-full bg-accent"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
