"use client";

import { ArrowUp } from "lucide-react";
import { useCallback, useState } from "react";
import { handleUserText, isSttSupported, unlockAudio } from "@/lib/voice/engine";
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import { Sheet } from "./Sheet";

const IDLE_SUGGESTIONS = ["I'm wiped, no idea what to cook", "Scan my fridge", "What can I make tonight?"];
const COOKING_SUGGESTIONS = ["Next step", "Repeat that", "Go back"];

/** Text input fallback for the conversation (mic blocked, unsupported, or just quieter). */
export function TypeSheet() {
  const open = useVoice((s) => s.typing);
  const thinking = useVoice((s) => s.status === "thinking");
  const cooking = useKitchen((s) => !!s.activeRecipe && s.finishedRecipeId !== s.activeRecipe.id);
  const [text, setText] = useState("");

  const close = useCallback(() => useVoice.getState().setTyping(false), []);

  function send(value: string) {
    const message = value.trim();
    if (!message || thinking) return;
    unlockAudio();
    setText("");
    close();
    void handleUserText(message);
  }

  return (
    <Sheet open={open} onClose={close} title="Type to Sous">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex items-center gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          enterKeyHint="send"
          aria-label="Message to Sous"
          placeholder="Ask Sous anything..."
          className="h-12 min-w-0 flex-1 rounded-pill border border-line bg-cream px-4 text-base text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim() || thinking}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-accent transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          <ArrowUp className="size-5" strokeWidth={2.5} />
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {(cooking ? COOKING_SUGGESTIONS : IDLE_SUGGESTIONS).map((s) => (
          <button
            key={s}
            type="button"
            disabled={thinking}
            onClick={() => send(s)}
            className="inline-flex min-h-11 items-center rounded-pill border border-line bg-cream px-4 text-sm font-medium text-ink-soft transition hover:bg-cream-deep active:scale-95 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {!isSttSupported() && (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Voice input isn&apos;t available in this browser, so typing is on. Sous still talks back.
        </p>
      )}
    </Sheet>
  );
}
