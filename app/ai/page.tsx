"use client";

/**
 * Figma 1.1 "home": the Sous logo (Leo listening), greeting, "Who's cooking with you?"
 * (Maya / Leo / Nova / Brock, each with its recorded greeting), Start talking, and "Try saying"
 * rows that start a call with that line. "Continue cooking" joins the rows while a recipe is
 * in progress; the settings sheet (hands-free, floating bubble, reset demo) sits behind a
 * small link at the bottom.
 */
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { SousLogo } from "@/components/mascot/Mascot";
import { SmartImage } from "@/components/ui/Misc";
import { restHint, useHandsFree } from "@/components/voice/HandsFree";
import { PersonaPicker, stopPersonaSample } from "@/components/voice/PersonaPicker";
import { SettingsSheet } from "@/components/voice/SettingsSheet";
import { DEMO_USER } from "@/lib/config";
import { cookHref } from "@/lib/kitchen/routes";
import { useKitchen } from "@/lib/stores/kitchen";
import { usePrefs } from "@/lib/stores/prefs";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { handleUserText, listen, startSession, unlockAudio } from "@/lib/voice/engine";
import { useAssistantName } from "@/lib/voice/persona";

const TRY_SAYING = [
  { text: "What can I make with what’s in my fridge?", icon: "/figma/v2/2014-698/icon-utensils.svg", tile: "bg-butter-soft" },
  { text: "I had a chicken wrap and a latte for lunch", icon: "/figma/v2/2014-698/icon-flame.svg", tile: "bg-flame-soft" },
] as const;

function greetingFor(date: Date): { greeting: string; question: string } {
  const h = date.getHours();
  if (h >= 5 && h < 12) return { greeting: "Good morning", question: "What are we cooking this morning?" };
  if (h >= 12 && h < 17) return { greeting: "Good afternoon", question: "What are we cooking today?" };
  return { greeting: "Good evening", question: "What are we cooking tonight?" };
}

/** "SAT · OCTOBER 3" */
function dateEyebrow(date: Date): string {
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "long" });
  return `${day} · ${month} ${date.getDate()}`.toUpperCase();
}

export default function AiHomePage() {
  const router = useRouter();
  const userName = usePrefs((s) => s.userName) || DEMO_USER.name;
  const status = useVoice((s) => s.status);
  const sessionActive = useVoice((s) => s.sessionActive);
  const [now] = useState(() => new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const copy = greetingFor(now);
  const midTurn = sessionActive && status !== "idle";

  /** Open the call. The tap is the gesture: unlock audio (and the mic) before navigating. */
  function openCall(): void {
    stopPersonaSample();
    unlockAudio();
    startSession();
    router.push("/ai/talk");
  }

  function start() {
    openCall();
    // Mid-turn: just go back to the conversation instead of interrupting.
    if (!midTurn) void listen();
  }

  function ask(text: string) {
    openCall();
    void handleUserText(text);
  }

  return (
    <div className="pb-nav pt-[var(--safe-top)]">
      {/* Top bar: logo tile (Leo listening) + "Sous", profile initial */}
      <header className="flex items-center justify-between px-5 py-1.5">
        <div className="flex items-center gap-2">
          <SousLogo size={36} />
          <span className="font-display text-[21px] font-semibold text-ink">Sous</span>
        </div>
        <Link
          href="/me"
          aria-label="Your profile"
          className="flex size-[38px] items-center justify-center rounded-[20px] bg-butter-soft text-body font-semibold text-butter-ink transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {userName.trim().charAt(0).toUpperCase() || "A"}
        </Link>
      </header>

      {/* Greeting */}
      <section className="flex flex-col gap-1 px-5 pt-[18px] animate-fade-up">
        <p className="whitespace-nowrap text-xs font-semibold tracking-[0.08em] text-ink-soft">{dateEyebrow(now)}</p>
        <h1 className="font-display text-title font-semibold text-ink">
          {copy.greeting}, {userName}
        </h1>
        <p className="text-body text-ink-soft">{copy.question}</p>
      </section>

      {/* Voice picker + Start */}
      <section className="flex flex-col gap-3 px-5 pt-[22px] animate-fade-up [animation-delay:60ms]">
        <div className="flex w-full flex-col gap-[14px] rounded-[24px] border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-2 whitespace-nowrap">
            <h2 className="shrink-0 text-body font-semibold text-ink">Who’s cooking with you?</h2>
            <p className="min-w-0 truncate text-caption text-ink-soft">Voices by ElevenLabs</p>
          </div>
          <PersonaPicker />
        </div>
        <button
          type="button"
          onClick={start}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-pill bg-accent text-base font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
        >
          <img src="/figma/v2/2014-698/icon-mic.svg" alt="" width={20} height={20} className="block size-5" />
          {sessionActive ? "Back to conversation" : "Start talking"}
        </button>
        {sessionActive && <LiveLine />}
      </section>

      <ContinueCooking />

      {/* Try saying */}
      <section className="flex flex-col gap-2.5 px-5 pt-[22px] animate-fade-up [animation-delay:120ms]">
        <h2 className="text-xs font-semibold tracking-[0.08em] text-ink-soft">TRY SAYING</h2>
        {TRY_SAYING.map((row) => (
          <Row
            key={row.text}
            onClick={() => ask(row.text)}
            lead={
              <span className={cn("flex size-9 items-center justify-center rounded-[10px]", row.tile)}>
                <img src={row.icon} alt="" width={18} height={18} className="block size-[18px]" />
              </span>
            }
          >
            <span className="block text-sm font-medium text-ink">{row.text}</span>
          </Row>
        ))}
      </section>

      <div className="flex justify-center pt-5">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-pill px-4 text-meta font-medium text-ink-soft transition hover:bg-cream-deep active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Settings2 aria-hidden className="size-4" />
          Settings
        </button>
      </div>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/** Figma "Try saying" row: 36px tinted icon tile, 14px label, chevron. Also used for Continue cooking. */
function Row({
  lead,
  children,
  onClick,
  href,
}: {
  lead: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "flex w-full items-center gap-3 rounded-[16px] border border-line bg-surface py-3 pl-3 pr-3.5 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const body = (
    <>
      <span className="shrink-0">{lead}</span>
      <span className="min-w-px flex-1">{children}</span>
      <img src="/figma/v2/2014-698/icon-chev-r.svg" alt="" width={18} height={18} className="block size-[18px] shrink-0" />
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

/** A recipe in progress: the same row style, with the recipe photo as the tile. */
function ContinueCooking() {
  const recipe = useKitchen((s) => s.activeRecipe);
  const stepIndex = useKitchen((s) => s.stepIndex);
  const finishedId = useKitchen((s) => s.finishedRecipeId);
  if (!recipe || finishedId === recipe.id) return null;
  const total = recipe.steps.length;

  return (
    <section className="flex flex-col gap-2.5 px-5 pt-[22px] animate-fade-up [animation-delay:90ms]">
      <h2 className="text-xs font-semibold tracking-[0.08em] text-ink-soft">CONTINUE COOKING</h2>
      <Row href={cookHref(recipe.id)} lead={<SmartImage src={recipe.image} alt="" className="size-9 rounded-[10px]" />}>
        <span className="block truncate text-sm font-medium text-ink">{recipe.title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">
          {stepIndex < 0 ? `${total} steps · not started` : `Step ${stepIndex + 1} of ${total}`}
        </span>
      </Row>
    </section>
  );
}

/** Mid-session (back on home with a call running): what the persona is hearing or just said. */
function LiveLine() {
  const name = useAssistantName();
  const status = useVoice((s) => s.status);
  const interim = useVoice((s) => s.interim);
  const caption = useVoice((s) => s.caption);
  const paused = useVoice((s) => s.paused);
  const handsFree = useHandsFree();

  let text: ReactNode = `${name} is on the line. Tap to keep talking.`;
  let live = false;
  if (paused) {
    text = `${name} is paused.`;
  } else if (status === "listening") {
    text = interim || "Listening...";
    live = true;
  } else if (status === "thinking") {
    text = "Thinking...";
    live = true;
  } else if (status === "idle" && handsFree.rest) {
    text = restHint(handsFree.rest, name);
  } else if (caption) {
    text = <>&ldquo;{caption}&rdquo;</>;
    live = status === "speaking";
  }

  return (
    <p
      aria-live="polite"
      className={cn("line-clamp-2 px-2 text-center text-sm leading-5", live ? "italic text-ink-soft" : "text-ink-faint")}
    >
      {text}
    </p>
  );
}
