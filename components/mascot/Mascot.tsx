/**
 * Mascots (Figma "Stormhacks-2026-Updated"): the AI's face wherever it speaks.
 * Design rules v1:
 *  - 24–64px: MascotAvatar = the "Mascot Head" component inside a soft circular avatar
 *  - >= 120px: MascotFigure = the full-body "Mascot" (Leo has final art per voice state)
 *  - never over photos or behind text; not on data-dense views
 * Geometry (insets) is copied from the Figma component exports so every mascot sits in its
 * frame exactly as designed. The art is the exported SVG, sized by its frame.
 */
import { mascotArt, type MascotState, type Persona, type PersonaId } from "@/lib/voice/personas";
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
 * Leo swaps to his final per-state art; the others use their full body for every state.
 */
export function MascotFigure({
  persona,
  state = "idle",
  width = 180,
  className,
  label,
}: {
  persona: Persona;
  state?: MascotState;
  width?: number;
  className?: string;
  label?: string;
}) {
  const g = persona.id === "leo" && state === "thinking" ? LEO_THINKING : BODY_INSETS[persona.id];
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
    </span>
  );
}
