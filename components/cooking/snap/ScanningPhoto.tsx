"use client";

import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const SPARKS = [
  { left: "22%", top: "30%", delay: 0 },
  { left: "68%", top: "24%", delay: 0.5 },
  { left: "48%", top: "62%", delay: 1 },
  { left: "78%", top: "70%", delay: 1.4 },
];

/** The meal photo with a scanning sweep while Gemini estimates nutrition */
export function ScanningPhoto({ src, label = "Estimating nutrition..." }: { src: string; label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-cream-deep shadow-card" aria-busy="true">
      <img src={src} alt="Your meal" className="size-full object-cover" />
      <div className="absolute inset-0 bg-ink/25" />

      {!reduce && (
        <motion.div
          className="absolute inset-x-0 h-28 bg-linear-to-b from-transparent via-white/40 to-transparent"
          initial={{ top: "-30%" }}
          animate={{ top: ["-30%", "100%"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {SPARKS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute size-3 rounded-full bg-white/90 shadow-[0_0_16px_4px_rgb(255_255_255/0.7)]"
          style={{ left: s.left, top: s.top }}
          initial={{ scale: 0, opacity: 0 }}
          animate={reduce ? { scale: 1, opacity: 0.8 } : { scale: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, delay: s.delay, repeat: Infinity, repeatDelay: 0.4 }}
        />
      ))}

      {/* viewfinder corners */}
      <span className="absolute left-4 top-4 size-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/90" />
      <span className="absolute right-4 top-4 size-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/90" />
      <span className="absolute bottom-4 left-4 size-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/90" />
      <span className="absolute bottom-4 right-4 size-7 rounded-br-xl border-b-[3px] border-r-[3px] border-white/90" />

      <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-ink/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          <Sparkles className="size-4 animate-pulse text-butter" />
          {label}
        </span>
      </div>
    </div>
  );
}

/** Skeleton shaped like the estimate card */
export function EstimateSkeleton() {
  return (
    <div className="space-y-4 rounded-card bg-surface p-5 shadow-card" aria-hidden>
      <div className="flex justify-between">
        <div className="skeleton h-6 w-28 rounded-pill" />
        <div className="skeleton h-4 w-24 rounded-pill" />
      </div>
      <div className="skeleton h-8 w-3/4 rounded-tile" />
      <div className="flex items-center gap-4">
        <div className="skeleton size-[116px] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-full rounded-pill" />
          <div className="skeleton h-4 w-5/6 rounded-pill" />
          <div className="skeleton h-4 w-2/3 rounded-pill" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[72px] rounded-tile" />
        ))}
      </div>
    </div>
  );
}
