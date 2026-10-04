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
  // Keyed on the last line's id, not the length: the store caps the transcript at 60 lines.
  const lastId = transcript[transcript.length - 1]?.id;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastId, interim, showThinking]);

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

/** Sous's tiny orb avatar next to its bubbles (gradient = the orb's palette) */
function SousDot() {
  return (
    <span
      aria-hidden
      className="mb-1 size-6 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffe2b0,#ff8a5c_40%,#f2542d_70%,#c93c18)] shadow-soft"
    />
  );
}

function Bubble({ line }: { line: TranscriptLine }) {
  if (line.role === "user") {
    return (
      <p className="max-w-[86%] self-end whitespace-pre-line rounded-[20px] rounded-br-md bg-accent-soft px-4 py-2.5 text-[15px] leading-snug text-ink animate-fade-up">
        {line.text}
      </p>
    );
  }
  return (
    <div className="flex max-w-[90%] items-end gap-2 self-start animate-fade-up">
      <SousDot />
      <p className="min-w-0 whitespace-pre-line rounded-[20px] rounded-bl-md bg-surface px-4 py-2.5 text-[15px] leading-snug text-ink shadow-soft">
        {line.text}
      </p>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex items-end gap-2 self-start animate-fade-up">
      <SousDot />
      <span
        role="status"
        aria-label="Sous is thinking"
        className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md bg-surface px-4 py-3.5 shadow-soft"
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
    </div>
  );
}
