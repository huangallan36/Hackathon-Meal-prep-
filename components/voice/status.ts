import type { VoiceStatus } from "@/lib/types";

/** Short label for the voice state ("Listening...", "Paused") */
export function statusLabel(status: VoiceStatus, paused: boolean): string {
  if (paused) return "Paused";
  switch (status) {
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "speaking":
      return "Speaking";
    default:
      return "Ready";
  }
}
