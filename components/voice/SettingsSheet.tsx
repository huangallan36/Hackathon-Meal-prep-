"use client";

import { AudioLines, BookOpen, RotateCcw, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/Card";
import { resetDemoData } from "@/lib/storage";
import { usePrefs } from "@/lib/stores/prefs";
import { toast } from "@/lib/stores/toast";
import { endSession } from "@/lib/voice/engine";
import { Sheet } from "./Sheet";

/** Gear sheet on the AI home: your name, demo reset, and how Sous works. */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      {/* Mounted fresh on every open, so the form starts from the saved name */}
      <SettingsBody onClose={onClose} />
    </Sheet>
  );
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const savedName = usePrefs((s) => s.userName);
  const [name, setName] = useState(savedName);
  const [confirmReset, setConfirmReset] = useState(false);
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, 24);

  function saveName() {
    if (!trimmed) return;
    usePrefs.getState().setUserName(trimmed);
    toast(`Hi, ${trimmed}!`, "success");
    onClose();
  }

  return (
    <div className="flex flex-col gap-7">
      <section>
        <SectionLabel>Your name</SectionLabel>
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            saveName();
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="given-name"
            aria-label="Your name"
            className="h-12 min-w-0 flex-1 rounded-pill border border-line bg-cream px-4 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <Button type="submit" disabled={!trimmed || trimmed === savedName}>
            Save
          </Button>
        </form>
      </section>

      <section>
        <SectionLabel>How Sous works</SectionLabel>
        <ul className="mt-3 flex flex-col gap-3">
          <HowRow icon={<Sparkles className="size-4" />} title="Gemini">
            Understands what you say, looks at your fridge photo, and estimates the nutrition of your finished plate.
          </HowRow>
          <HowRow icon={<AudioLines className="size-4" />} title="ElevenLabs">
            Gives Sous a natural voice, so you can cook hands-free while it reads each step.
          </HowRow>
          <HowRow icon={<BookOpen className="size-4" />} title="Spoonacular">
            Finds real recipes that use what you already have, with what you&apos;re missing.
          </HowRow>
        </ul>
      </section>

      <section className="rounded-tile bg-cream p-4">
        {confirmReset ? (
          <div className="animate-fade-up">
            <p className="text-sm font-semibold text-ink">Reset all demo data?</p>
            <p className="mt-1 text-sm text-ink-soft">
              This clears your diary, posts, fridge scan and cooking progress, then reloads the app.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  endSession();
                  resetDemoData();
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex min-h-11 w-full items-center gap-3 text-left"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-surface text-danger shadow-soft">
              <RotateCcw className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Reset demo data</span>
              <span className="block text-xs text-ink-soft">Start the demo fresh</span>
            </span>
          </button>
        )}
      </section>
    </div>
  );
}

function HowRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-sm leading-snug text-ink-soft">{children}</span>
      </span>
    </li>
  );
}
