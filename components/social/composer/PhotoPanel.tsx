"use client";

import { ChefHat, ImagePlus, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/Misc";
import { PhotoPicker, type PhotoSource } from "@/components/ui/PhotoPicker";

export type PhotoOrigin = PhotoSource | "draft";

/** Step 1 of the composer: the dish photo (preview with a "checking" scan, or the picker). */
export function PhotoPanel({
  photo,
  origin,
  scanning,
  sampleSrc,
  disabled,
  onPick,
  onRemove,
}: {
  photo: string | null;
  origin: PhotoOrigin | null;
  scanning: boolean;
  sampleSrc?: string;
  disabled?: boolean;
  onPick: (src: string, source: PhotoSource) => void;
  onRemove: () => void;
}) {
  if (!photo) {
    return (
      <div className="flex flex-col gap-3 animate-fade-up">
        <div className="flex flex-col items-center gap-2 rounded-card border-2 border-dashed border-line bg-surface/70 px-6 py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <ImagePlus className="size-6" />
          </span>
          <p className="font-display text-lg font-semibold text-ink">Show off what you cooked</p>
          <p className="max-w-[250px] text-sm text-ink-soft">Food photos only. Sous gives every post a quick check before it goes live.</p>
        </div>
        <PhotoPicker onPick={onPick} sampleSrc={sampleSrc} disabled={disabled} />
      </div>
    );
  }

  return (
    <motion.div
      key={`${photo.length}:${photo.slice(-32)}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="relative aspect-[5/4] overflow-hidden rounded-card bg-cream-deep shadow-card"
    >
      <SmartImage src={photo} alt="Your dish" className="size-full" />

      {origin === "draft" && (
        <OriginBadge icon={<ChefHat className="size-3.5 text-accent" />}>From your Sous cook</OriginBadge>
      )}
      {origin === "sample" && <OriginBadge icon={<Sparkles className="size-3.5 text-accent" />}>Sample photo</OriginBadge>}

      {!scanning && (
        <IconButton
          label="Change photo"
          onClick={onRemove}
          disabled={disabled}
          className="absolute right-3 top-3 bg-surface/90 backdrop-blur"
        >
          <X className="size-5" />
        </IconButton>
      )}

      {scanning && <ScanOverlay />}
    </motion.div>
  );
}

function OriginBadge({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-pill bg-surface/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-soft backdrop-blur animate-pop">
      {icon}
      {children}
    </span>
  );
}

/** A soft light band sweeping over the photo while Gemini looks at it */
function ScanOverlay() {
  return (
    <div className="absolute inset-0 bg-ink/20" aria-hidden>
      <motion.div
        className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-transparent via-white/50 to-transparent"
        initial={{ y: "-100%" }}
        animate={{ y: "300%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-pill bg-surface/95 px-4 py-2 text-sm font-semibold text-ink shadow-lift">
        <Sparkles className="size-4 animate-pulse text-accent" />
        Sous is checking...
      </span>
    </div>
  );
}
