/**
 * Mascots (Figma "Stormhacks-2026-Updated"): the AI's face wherever it speaks.
 * Design rules v1:
 *  - 24–64px: MascotAvatar = the "Mascot Head" component inside a soft circular avatar
 *  - >= 120px: MascotFigure = the full-body "Mascot" (Leo has final art per voice state)
 *  - never over photos or behind text; not on data-dense views
 * Geometry (insets) is copied from the Figma component exports so every mascot sits in its
 * frame exactly as designed. The art is the exported SVG, sized by its frame.
 */
import {
  mascotArt,
  PERSONAS,
  type MascotState,
  type Persona,
  type PersonaId,
} from "@/lib/voice/personas";
import { cn } from "@/lib/utils";

/* Figma "Mascot Head" (2014:2264): square frame, art inset per mascot */
const HEAD_INSETS: Record<PersonaId, { outer: string; inner: string }> = {
  maya: { outer: "inset-[2.81%_10.2%_-3.4%_10.2%]", inner: "inset-[0_-1.72%_-1.36%_-1.72%]" },
  leo: { outer: "inset-[3.71%_16.32%_-21.53%_16.32%]", inner: "inset-[0_-2.07%_-1.19%_-2.07%]" },
  nova: { outer: "inset-[1.37%_-1.06%_-4.26%_-1.06%]", inner: "inset-[0_-1.4%_-1.39%_-1.4%]" },
  brock: { outer: "inset-[4.19%_20.16%_0.79%_20.16%]", inner: "inset-[-1.11%_-1.77%]" },
};

/* Figma "Mascot" (2014:1842) and "Leo / State" (2014:2370): 360x450 frame, art inset per mascot */
const BODY_INSETS: Record<PersonaId, { outer: string; inner: string }> = {
  maya: { outer: "inset-[13.84%_14.55%_9.11%_10%]", inner: "inset-[0_-0.9%_-0.71%_-0.9%]" },
  leo: { outer: "inset-[11.71%_6.11%_1.56%_15%]", inner: "inset-[0_-0.74%_-0.63%_-0.86%]" },
  nova: { outer: "inset-[15.08%_10%_10%_10%]", inner: "inset-[0_-0.85%_-0.73%_-0.85%]" },
  brock: { outer: "inset-[5.78%_18.33%_2.89%_18.33%]", inner: "inset-[-0.6%_-1.07%]" },
};
/* Leo "Thinking" has a thought bubble, so its art box is wider on the right */
const LEO_THINKING = { outer: "inset-[11.71%_3.06%_1.56%_15%]", inner: "inset-[0_-0.83%_-0.63%_-0.83%]" };

/**
 * State cues for the mascots without final per-state art: the "state overlay" layer of the
 * Figma state sketches (Maya 2014:2635, Nova 2014:2951, Brock 2014:3117), in the same 360x450
 * frame as the body. Only the cues are layered on the final body: sound arcs while listening,
 * thought bubbles while thinking. Speaking has no overlay (the call stage bobs the mascot).
 */
type CueState = Extract<MascotState, "listening" | "thinking">;
const STATE_CUES: Partial<Record<PersonaId, Record<CueState, { src: string; outer: string; inner: string }>>> = {
  maya: {
    listening: {
      src: "/figma/v2/2014-2635/group-1.svg",
      outer: "inset-[45.33%_11.39%_43.11%_81.11%]",
      inner: "inset-[-2.88%_-5.56%]",
    },
    thinking: {
      src: "/figma/v2/2014-2635/group-2.svg",
      outer: "inset-[12.44%_2.78%_69.56%_78.06%]",
      inner: "inset-[-1.85%_-2.17%]",
    },
  },
  nova: {
    listening: {
      src: "/figma/v2/2014-2951/group-1.svg",
      outer: "inset-[45.33%_9.72%_43.11%_82.78%]",
      inner: "inset-[-2.88%_-5.56%]",
    },
    thinking: {
      src: "/figma/v2/2014-2951/group-2.svg",
      outer: "inset-[14.67%_1.11%_67.33%_79.72%]",
      inner: "inset-[-1.85%_-2.17%]",
    },
  },
  brock: {
    listening: {
      src: "/figma/v2/2014-3117/group-1.svg",
      outer: "inset-[54.22%_27.5%_34.22%_65%]",
      inner: "inset-[-2.88%_-5.56%]",
    },
    thinking: {
      src: "/figma/v2/2014-3117/group-2.svg",
      outer: "inset-[2.67%_18.89%_79.33%_61.94%]",
      inner: "inset-[-1.85%_-2.17%]",
    },
  },
};

function cueFor(persona: Persona, state: MascotState) {
  if (state !== "listening" && state !== "thinking") return null;
  // Final per-state art wins (Leo); the sketch cue is only for mascots without it.
  if (persona.states?.[state]) return null;
  return STATE_CUES[persona.id]?.[state] ?? null;
}

const preloaded = new Set<string>();

/**
 * Warm the cache with every state's art (and cue) for `persona`, so a voice state change
 * swaps the mascot on the next frame (design rules: within 150ms) instead of waiting on a
 * download. Call it from an effect where the mascot follows the voice.
 */
export function preloadMascotStates(persona: Persona): void {
  if (typeof window === "undefined") return;
  const states: MascotState[] = ["idle", "listening", "thinking", "speaking"];
  for (const state of states) {
    for (const src of [mascotArt(persona, state), cueFor(persona, state)?.src]) {
      if (!src || preloaded.has(src)) continue;
      preloaded.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }
}

/** The bare head art in a square box of `size` px (no background) */
export function MascotHead({ persona, size, className }: { persona: Persona; size: number; className?: string }) {
  const g = HEAD_INSETS[persona.id];
  return (
    <span className={cn("relative block shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 overflow-hidden">
        <span className={cn("absolute", g.outer)}>
          <span className={cn("absolute", g.inner)}>
            <img src={persona.head} alt="" className="block size-full max-w-none" draggable={false} />
          </span>
        </span>
      </span>
    </span>
  );
}

/**
 * Soft circular avatar with the mascot head (Figma "avatar/<Name>"): circle in the persona's
 * soft tint, head at 108% of the circle, horizontally centered, top-aligned, clipped.
 */
export function MascotAvatar({
  persona,
  size = 46,
  className,
  label,
}: {
  persona: Persona;
  size?: number;
  className?: string;
  /** Accessible name; omit when the name is shown next to it */
  label?: string;
}) {
  const head = Math.round(size * 1.08 * 100) / 100;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, backgroundColor: persona.soft }}
    >
      <span className="absolute top-0" style={{ left: (size - head) / 2 }}>
        <MascotHead persona={persona} size={head} />
      </span>
    </span>
  );
}

/**
 * Full-body mascot in the Figma 360x450 frame, scaled to `width` (height = width * 1.25).
 * Leo swaps to his final per-state art; the others keep their full body and get the design's
 * sketch cues on top while listening (sound arcs) or thinking (thought bubbles).
 */
export function MascotFigure({
  persona,
  state = "idle",
  width = 180,
  className,
  label,
  cues = true,
}: {
  persona: Persona;
  state?: MascotState;
  width?: number;
  className?: string;
  label?: string;
  /** Layer the listening / thinking cue on mascots without per-state art (default on) */
  cues?: boolean;
}) {
  const g = persona.id === "leo" && state === "thinking" ? LEO_THINKING : BODY_INSETS[persona.id];
  const cue = cues ? cueFor(persona, state) : null;
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative block shrink-0", className)}
      style={{ width, height: width * 1.25 }}
    >
      <span className="absolute inset-0 overflow-hidden">
        <span className={cn("absolute", g.outer)}>
          <span className={cn("absolute", g.inner)}>
            <img src={mascotArt(persona, state)} alt="" className="block size-full max-w-none" draggable={false} />
          </span>
        </span>
      </span>
      {cue && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden" data-cue={state}>
          <span className={cn("absolute", cue.outer)}>
            <span className={cn("absolute", cue.inner)}>
              <img src={cue.src} alt="" className="block size-full max-w-none" draggable={false} />
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

const LEO = PERSONAS.find((p) => p.id === "leo") ?? PERSONAS[0];

/**
 * The Sous brand mark (Figma "logo/Leo listening", 2014:3291): Leo's Listening art on a tile,
 * built from the Leo / State component like the design (so it updates with him). The art
 * frame (0.987 x 1.234 of the tile) starts 8% above the tile and is clipped by it.
 *  - tone "soft": soft green tile (app icon, headers: the home top bar is the 36px circle)
 *  - tone "dark": dark green, for when it sits on photos
 * `radius` defaults to a circle (home 36px, lockup 58px); the app-icon tiles use ~22% (27 at 120).
 */
export function SousLogo({
  size = 36,
  radius,
  tone = "soft",
  className,
  label,
}: {
  size?: number;
  radius?: number;
  tone?: "soft" | "dark";
  className?: string;
  /** Accessible name; omit when "Sous" is written next to it */
  label?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-block shrink-0 overflow-hidden",
        tone === "dark" ? "bg-accent" : "bg-accent-soft",
        className,
      )}
      style={{ width: size, height: size, borderRadius: radius ?? size / 2 }}
    >
      <span className="absolute" style={{ left: size * 0.00625, top: size * -0.0815 }}>
        <MascotFigure persona={LEO} state="listening" width={size * 0.98742} cues={false} />
      </span>
    </span>
  );
}
