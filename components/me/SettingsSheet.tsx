"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/voice/Sheet";
import { DEMO_USER } from "@/lib/config";
import { resetDemoData } from "@/lib/storage";
import { usePrefs } from "@/lib/stores/prefs";
import { cn } from "@/lib/utils";
import { setHandsFreeMode } from "@/lib/voice/engine";

const NAME_MAX = 40;

/** Me > settings: what Sous calls you, hands-free conversation, and "Reset demo data" */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <SettingsBody />
    </Sheet>
  );
}

function SettingsBody() {
  const id = useId();
  const userName = usePrefs((s) => s.userName);
  const setUserName = usePrefs((s) => s.setUserName);
  const handsFree = usePrefs((s) => s.handsFree);
  const [confirming, setConfirming] = useState(false);

  function toggleHandsFree() {
    try {
      setHandsFreeMode(!handsFree);
    } catch {
      usePrefs.getState().setHandsFree(!handsFree);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div>
        <label htmlFor={`${id}-name`} className="mb-2 block text-sm font-semibold text-ink">
          What should Sous call you?
        </label>
        <input
          id={`${id}-name`}
          value={userName}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          placeholder={DEMO_USER.name}
          onChange={(e) => setUserName(e.target.value.replace(/[\r\n]+/g, " ").slice(0, NAME_MAX))}
          onBlur={(e) => setUserName(e.target.value.trim() || DEMO_USER.name)}
          className="h-12 w-full rounded-tile border border-line bg-cream/60 px-3.5 text-base text-ink outline-none transition placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="flex items-center gap-3 rounded-tile border border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p id={`${id}-hf`} className="text-body font-semibold text-ink">
            Hands-free conversation
          </p>
          <p className="mt-0.5 text-meta text-ink-soft">Sous listens again after it talks, so you don&apos;t have to tap.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={handsFree}
          aria-labelledby={`${id}-hf`}
          onClick={toggleHandsFree}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-pill transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            handsFree ? "bg-accent" : "bg-line-strong",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "absolute left-0.5 top-0.5 size-6 rounded-full bg-surface transition-transform duration-200",
              handsFree ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      {confirming ? (
        <div className="animate-pop rounded-tile bg-cream p-4" role="alertdialog" aria-labelledby={`${id}-reset`}>
          <p id={`${id}-reset`} className="text-center text-sm font-semibold text-ink">
            Reset the demo?
          </p>
          <p className="mt-1 text-center text-meta text-ink-soft">This clears what you logged, planned and posted on this device.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => resetDemoData()}>
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <Button full variant="ghost" className="text-flame" icon={<RotateCcw className="size-4" />} onClick={() => setConfirming(true)}>
          Reset demo data
        </Button>
      )}
    </div>
  );
}
