"use client";

import { ImageUp, PenLine, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";

/**
 * Friendly inline card shown when moderation turns a post down. A flat white Figma card
 * with the "low / over" status pair (flame-soft circle, flame icon).
 */
export function BlockedNotice({
  reason,
  onChangePhoto,
  onEditCaption,
}: {
  reason: string;
  onChangePhoto: () => void;
  onEditCaption: () => void;
}) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="rounded-card bg-surface p-4 shadow-card"
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-flame-soft text-flame">
          <ShieldAlert className="size-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-body font-semibold leading-tight text-ink">Not quite ready to post</p>
          <p className="mt-1 text-meta leading-snug text-ink-soft">{reason}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<ImageUp className="size-4" strokeWidth={1.9} />} onClick={onChangePhoto}>
          New photo
        </Button>
        <Button variant="secondary" icon={<PenLine className="size-4" strokeWidth={1.9} />} onClick={onEditCaption}>
          Edit caption
        </Button>
      </div>
    </motion.div>
  );
}
