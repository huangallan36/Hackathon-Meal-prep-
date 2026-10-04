"use client";

import { FRIDGE_SCAN_HREF } from "@/lib/kitchen/routes";
import { CalendarDays, ChevronRight, Flame, Mic, Refrigerator, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Orb } from "@/components/orb/Orb";
import { Button, IconButton } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/Card";
import { SmartImage } from "@/components/ui/Misc";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SettingsSheet } from "@/components/voice/SettingsSheet";
import { VoicePicker } from "@/components/voice/VoicePicker";
import { DEMO_USER } from "@/lib/config";
import { useKitchen } from "@/lib/stores/kitchen";
import { usePrefs } from "@/lib/stores/prefs";
import { userByHandle, useSocial } from "@/lib/stores/social";
import { useVoice } from "@/lib/stores/voice";
import type { VoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { listen, startSession, unlockAudio } from "@/lib/voice/engine";

function timeOfDayCopy(date: Date): { greeting: string; subtitle: string } {
  const h = date.getHours();
  if (h >= 5 && h < 11) return { greeting: "Good morning", subtitle: "Morning! Want a quick breakfast idea?" };
  if (h >= 11 && h < 14) return { greeting: "Good afternoon", subtitle: "Lunch break? Let's make something good." };
  if (h >= 14 && h < 17) return { greeting: "Good afternoon", subtitle: "Afternoon slump? Let's plan tonight's dinner." };
  if (h >= 17 && h < 22) return { greeting: "Good evening", subtitle: "Rough day? Let's figure out dinner together." };
  return { greeting: "Hey, night owl", subtitle: "Late-night hunger? I've got you." };
}

export default function AiHomePage() {
  const router = useRouter();
  const userName = usePrefs((s) => s.userName);
  const status = useVoice((s) => s.status);
  const paused = useVoice((s) => s.paused);
  const sessionActive = useVoice((s) => s.sessionActive);
  const streak = useSocial((s) => userByHandle(s.users, DEMO_USER.handle)?.streak ?? 5);
  const [copy] = useState(() => timeOfDayCopy(new Date()));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visual: VoiceStatus = paused ? "idle" : status;
  const midTurn = sessionActive && status !== "idle";

  function start() {
    // The tap is the gesture: unlock audio and open the mic before navigating.
    unlockAudio();
    startSession();
    router.push("/ai/talk");
    // Mid-turn: just go back to the conversation instead of interrupting Sous.
    if (!midTurn) void listen();
  }

  return (
    <>
      <ScreenHeader
        title={
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-5 rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffd2a6,#f2542d_60%,#c93c18)] shadow-accent"
            />
            Sous
          </span>
        }
        right={
          <IconButton label="Settings" onClick={() => setSettingsOpen(true)} className="size-11">
            <Settings2 className="size-5" />
          </IconButton>
        }
      />

      <div className="px-5 pb-nav">
        <section className="pt-2 animate-fade-up">
          <p className="text-sm font-medium text-ink-soft">{copy.greeting}</p>
          <h2 className="mt-1 font-display text-[34px] font-semibold leading-[1.08] tracking-tight text-ink">
            Welcome back,
            <br />
            <span className="text-accent">{userName || DEMO_USER.name}</span>
          </h2>
          <p className="mt-2 max-w-[300px] text-[15px] leading-snug text-ink-soft">{copy.subtitle}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-butter-soft px-3 py-1.5 text-sm font-semibold text-ink">
            <Flame className="size-4 fill-accent/25 text-accent" />
            {streak}-day cooking streak
          </span>
        </section>

        <section className="relative mt-6 flex flex-col items-center animate-fade-up [animation-delay:80ms]">
          <div className="py-4">
            <Orb size={170} status={visual} onClick={start} label="Start talking to Sous" />
          </div>
          <Button size="lg" full className="mt-6" icon={<Mic className="size-5" />} onClick={start}>
            {sessionActive ? "Back to conversation" : "Start"}
          </Button>
          <LiveLine />
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 animate-fade-up [animation-delay:160ms]">
          <ContinueCooking />
          <Tile
            href={FRIDGE_SCAN_HREF}
            icon={<Refrigerator className="size-5" />}
            title="Scan my fridge"
            body="Snap a photo, get recipes"
          />
          <Tile
            href="/ai/plan"
            icon={<CalendarDays className="size-5" />}
            title="Plan meals"
            body="Your week, sorted"
            tone="herb"
          />
        </section>

        <section className="mt-9 animate-fade-up [animation-delay:240ms]">
          <SectionHeader
            title="Sous's voice"
            action={<span className="text-xs font-medium text-ink-faint">Powered by ElevenLabs</span>}
          />
          <p className="mt-1 text-sm text-ink-soft">Pick who talks you through dinner. Tap play to hear them.</p>
          <VoicePicker className="mt-3" />
        </section>
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

/**
 * Under the Start button: a prompt to try, or (mid-session) what Sous is hearing or just said.
 * The floating orb is hidden here, so this is the AI home's live caption.
 */
function LiveLine() {
  const sessionActive = useVoice((s) => s.sessionActive);
  const status = useVoice((s) => s.status);
  const interim = useVoice((s) => s.interim);
  const caption = useVoice((s) => s.caption);

  let text: ReactNode = <>Try &ldquo;I&apos;m wiped, no idea what to cook&rdquo;</>;
  let live = false;
  if (sessionActive && status === "listening") {
    text = interim || "Listening...";
    live = true;
  } else if (sessionActive && status === "thinking") {
    text = "Thinking...";
    live = true;
  } else if (sessionActive && caption) {
    text = <>&ldquo;{caption}&rdquo;</>;
    live = true;
  }

  return (
    <p
      aria-live="polite"
      className={cn(
        "mt-3 line-clamp-2 min-h-10 max-w-[320px] text-center text-sm leading-5",
        live ? "italic text-ink-soft" : "text-ink-faint",
      )}
    >
      {text}
    </p>
  );
}

function ContinueCooking() {
  const recipe = useKitchen((s) => s.activeRecipe);
  const stepIndex = useKitchen((s) => s.stepIndex);
  const finishedId = useKitchen((s) => s.finishedRecipeId);
  if (!recipe || finishedId === recipe.id) return null;

  const total = recipe.steps.length;
  const progress = total ? Math.max(0, stepIndex + 1) / total : 0;

  return (
    <Link
      href={`/ai/cook/${recipe.id}`}
      className="col-span-2 flex items-center gap-3 rounded-card bg-surface p-3 pr-4 shadow-card transition active:scale-[0.99]"
    >
      <SmartImage src={recipe.image} alt="" className="size-16 shrink-0 rounded-tile" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">Continue cooking</span>
        <span className="block truncate font-display text-[17px] font-semibold leading-tight text-ink">
          {recipe.title}
        </span>
        <span className="mt-1.5 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
            <span
              className="block h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
          <span className="shrink-0 text-xs text-ink-soft">
            {stepIndex < 0 ? "Not started" : `Step ${stepIndex + 1} of ${total}`}
          </span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-ink-faint" />
    </Link>
  );
}

function Tile({
  href,
  icon,
  title,
  body,
  tone = "accent",
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  tone?: "accent" | "herb";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[132px] flex-col justify-between rounded-card bg-surface p-4 shadow-card transition hover:shadow-lift active:scale-[0.98]"
    >
      <span
        className={
          tone === "herb"
            ? "flex size-10 items-center justify-center rounded-full bg-herb-soft text-herb"
            : "flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent-strong"
        }
      >
        {icon}
      </span>
      <span>
        <span className="block font-display text-[17px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{body}</span>
      </span>
    </Link>
  );
}
