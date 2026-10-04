"use client";

import { useCallback, useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { DEMO_USER } from "@/lib/config";
import { fmt } from "@/lib/diary/stats";
import { usePrefs } from "@/lib/stores/prefs";
import { SettingsSheet } from "./SettingsSheet";

/** The name on Me: the demo user's full name, unless they told Sous to call them something else */
export function useDisplayName(): string {
  const userName = usePrefs((s) => s.userName).trim();
  return userName && userName !== DEMO_USER.name ? userName : DEMO_USER.fullName;
}

/** Figma 3.1 profile header: initial avatar, "Alex Rivera", "Goal: lean bulk · 2,200 kcal", settings */
export function ProfileHeader({ calorieGoal }: { calorieGoal: number }) {
  const name = useDisplayName();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const initial = (name.match(/\p{L}|\p{N}/u)?.[0] ?? "A").toUpperCase();

  return (
    <header className="flex items-center gap-3 px-5 pt-[calc(var(--safe-top)+8px)]">
      <span
        aria-hidden
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-butter-soft text-lg font-semibold leading-[normal] text-butter-ink"
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
        <h1 className="truncate font-display text-heading font-semibold text-ink">{name}</h1>
        <p className="truncate text-xs text-ink-soft">
          Goal: {DEMO_USER.goal} · {fmt(calorieGoal)} kcal
        </p>
      </div>
      <IconButton label="Settings" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <img src="/figma/screens/2-155/icon-settings.svg" alt="" width={18} height={18} className="block size-[18px]" />
      </IconButton>
      <SettingsSheet open={open} onClose={close} />
    </header>
  );
}
