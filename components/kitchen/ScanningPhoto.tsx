"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { SmartImage } from "@/components/ui/Misc";

const HINTS = ["Checking the shelves", "Spotting the veggies", "Reading the dairy drawer", "Counting what's cookable"];

/** Where the "found something" pings pop up, as % of the photo */
const PINGS = [
  { x: 24, y: 28, delay: 0.5 },
  { x: 70, y: 22, delay: 1.1 },
  { x: 46, y: 52, delay: 1.7 },
  { x: 78, y: 64, delay: 2.3 },
  { x: 30, y: 78, delay: 2.9 },
];

/** The fridge photo with a sweeping scan line, shimmer and detection pings while Gemini works. */
export function ScanningPhoto({ src, label = "Gemini is looking..." }: { src: string; label?: string }) {
  const [hint, setHint] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setHint((h) => (h + 1) % HINTS.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-card bg-ink shadow-lift" role="status" aria-live="polite">
      <SmartImage src={src} alt="Your fridge photo" className="aspect-[4/5] w-full opacity-90" />

      {/* Vignette so the overlays read on bright photos */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/70" />

      {/* Diagonal shimmer */}
      <div className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgb(255_255_255/0.16)_50%,transparent_65%)] bg-[length:200%_100%]" />

      {/* Sweeping scan line with a glowing trail */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0"
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.2 }}
      >
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-accent/35" />
        <div className="absolute inset-x-0 -top-px h-[3px] bg-accent shadow-[0_0_22px_6px_color-mix(in_srgb,var(--color-accent)_70%,transparent)]" />
      </motion.div>

      {/* Viewfinder corners */}
      <Corner className="left-4 top-4 border-l-[3px] border-t-[3px] rounded-tl-2xl" />
      <Corner className="right-4 top-4 border-r-[3px] border-t-[3px] rounded-tr-2xl" />
      <Corner className="bottom-4 left-4 border-b-[3px] border-l-[3px] rounded-bl-2xl" />
      <Corner className="bottom-4 right-4 border-b-[3px] border-r-[3px] rounded-br-2xl" />

      {/* Detection pings */}
      {PINGS.map((p) => (
        <motion.span
          key={`${p.x}-${p.y}`}
          aria-hidden
          className="pointer-events-none absolute -ml-2 -mt-2 flex size-4 items-center justify-center"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: p.delay, type: "spring", stiffness: 400, damping: 18 }}
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-butter/70" />
          <span className="relative inline-flex size-2.5 rounded-full bg-butter ring-2 ring-white/80" />
        </motion.span>
      ))}

      {/* Status pill */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-4 pb-7">
        <span className="inline-flex items-center gap-2 rounded-pill bg-surface/95 px-4 py-2 text-sm font-semibold text-ink shadow-lift backdrop-blur">
          <motion.span
            animate={{ rotate: [0, 18, -12, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex text-accent"
          >
            <Sparkles className="size-4" />
          </motion.span>
          {label}
        </span>
        <div className="h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={hint}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-[13px] font-medium text-white/85"
            >
              {HINTS[hint]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span aria-hidden className={`pointer-events-none absolute size-9 border-white/85 ${className}`} />;
}
