"use client";

import { ImageUp, PenLine, ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";

/** Friendly inline card shown when moderation turns a post down. */
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
      className="rounded-card border border-accent/25 bg-accent-soft/70 p-4"
    >
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-accent shadow-soft">
          <ShieldAlert className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold leading-tight text-ink">Not quite ready to post</p>
          <p className="mt-1 text-sm text-ink-soft">{reason}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-13">
        <Button size="sm" variant="secondary" icon={<ImageUp className="size-4" />} onClick={onChangePhoto}>
          Change photo
        </Button>
        <Button size="sm" variant="ghost" icon={<PenLine className="size-4" />} onClick={onEditCaption}>
          Edit caption
        </Button>
      </div>
    </motion.div>
  );
}
