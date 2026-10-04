"use client";

import { motion, useReducedMotion } from "motion/react";
import { SmartImage } from "@/components/ui/Misc";
import { SPARKLE_GREEN } from "../icons";

const SPARKS = [
  { left: "22%", top: "30%", delay: 0 },
  { left: "68%", top: "24%", delay: 0.5 },
  { left: "48%", top: "62%", delay: 1 },
  { left: "78%", top: "70%", delay: 1.4 },
];

/** The meal photo (photo frame, radius 18) with a scanning sweep while Gemini estimates nutrition */
export function ScanningPhoto({ src, label = "Estimating nutrition…" }: { src: string; label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-tile bg-cream-deep" aria-busy="true">
      <SmartImage src={src} alt="Your meal" className="size-full" />
      <div className="absolute inset-0 bg-ink/15" />

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
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface/95 px-3.5 py-2 text-meta font-semibold text-accent backdrop-blur" role="status">
          <motion.img
            src={SPARKLE_GREEN}
            alt=""
            width={12}
            height={12}
            className="block size-3"
            animate={reduce ? undefined : { rotate: [0, 90, 180], scale: [1, 1.25, 1] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          {label}
        </span>
      </div>
    </div>
  );
}

/** Skeleton shaped like the estimate card */
export function EstimateSkeleton() {
  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-card" aria-hidden>
      <div className="flex justify-between">
        <div className="skeleton h-[22px] w-24 rounded-pill" />
        <div className="skeleton h-4 w-28 rounded-pill" />
      </div>
      <div className="skeleton h-12 w-full rounded-tile" />
      <div className="skeleton h-11 w-full rounded-pill" />
      <div className="flex items-center gap-4 pt-1">
        <div className="skeleton size-[104px] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-[60px] w-full rounded-tile" />
          <div className="skeleton h-4 w-5/6 rounded-pill" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[58px] rounded-thumb" />
        ))}
      </div>
    </div>
  );
}
