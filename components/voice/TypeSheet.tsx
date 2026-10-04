"use client";

/**
 * Type-to-talk sheet for every screen except the call (which has its own typing view):
 * mic blocked or unsupported, or just quieter. Same composer as the Figma 1.3 chat.
 */
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import { closeTyping, handleUserText, isSttSupported, unlockAudio } from "@/lib/voice/engine";
import { useAssistantName } from "@/lib/voice/persona";
import { Composer } from "./Composer";
import { Sheet } from "./Sheet";

const IDLE_SUGGESTIONS = ["I'm wiped, no idea what to cook", "Scan my fridge", "What can I make tonight?"];
const COOKING_SUGGESTIONS = ["Next step", "Repeat that", "Go back"];

/** Not closeTyping(): the turn that follows takes over, so hands-free must not reopen the mic first. */
const closeForTurn = () => useVoice.getState().setTyping(false);

export function TypeSheet() {
  const open = useVoice((s) => s.typing);
  const thinking = useVoice((s) => s.status === "thinking");
  const cooking = useKitchen((s) => !!s.activeRecipe && s.finishedRecipeId !== s.activeRecipe.id);
  const name = useAssistantName();

  function send(value: string) {
    if (thinking) return;
    unlockAudio();
    closeForTurn();
    void handleUserText(value);
  }

  return (
    <Sheet open={open} onClose={closeTyping} title={`Type to ${name}`}>
      <Composer autoFocus onBeforeSend={closeForTurn} />

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
          Voice input isn&apos;t available in this browser, so typing is on. {name} still talks back.
        </p>
      )}
    </Sheet>
  );
}
