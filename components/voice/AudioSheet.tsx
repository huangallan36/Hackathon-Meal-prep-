"use client";

/**
 * The call screen's audio button (Figma 1.2, top right): who's talking (switch sous-chef
 * mid-call), hands-free, and which engine is voicing the replies.
 */
import { AudioLines } from "lucide-react";
import { SectionLabel } from "@/components/ui/Card";
import { useVoice } from "@/lib/stores/voice";
import { HandsFreeSettingRow } from "./HandsFree";
import { PersonaPicker } from "./PersonaPicker";
import { Sheet } from "./Sheet";

export function AudioSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const engine = useVoice((s) => s.ttsEngine);
  const note =
    engine === "browser"
      ? "ElevenLabs is unreachable right now, so replies use your browser's backup voice."
      : "Replies are voiced by ElevenLabs.";
  return (
    <Sheet open={open} onClose={onClose} title="Audio & voice">
      <div className="flex flex-col gap-6">
        <section>
          <SectionLabel>Sous-chef</SectionLabel>
          <PersonaPicker className="mt-3" />
        </section>
        <section>
          <SectionLabel>Conversation</SectionLabel>
          <HandsFreeSettingRow className="mt-3" />
        </section>
        <p className="flex items-start gap-2 rounded-tile bg-cream p-3 text-xs leading-snug text-ink-soft">
          <AudioLines aria-hidden className="mt-px size-4 shrink-0 text-accent" />
          {note}
        </p>
      </div>
    </Sheet>
  );
}
