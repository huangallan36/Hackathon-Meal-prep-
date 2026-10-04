"use client";

/**
 * Figma 1.3 chat thread: the conversation as bubbles (the persona on the left: its 28px
 * mascot avatar beside a white bubble with a 1px line and a 6px top-left corner; you on the
 * right: avocado, 6px top-right corner), a recipe card with the dish's photo under the line
 * that suggested or opened a recipe, and the typing indicator while the persona thinks.
 */
import { useEffect, useRef } from "react";
import { MascotAvatar } from "@/components/mascot/Mascot";
import { SmartImage } from "@/components/ui/Misc";
import { cookHref, groceriesHref } from "@/lib/kitchen/routes";
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice, type TranscriptLine } from "@/lib/stores/voice";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { handleUserText, unlockAudio } from "@/lib/voice/engine";
import { usePersona, type Persona } from "@/lib/voice/persona";
import { useCallNav } from "./useCall";
import { useRecipeRef } from "./useCallContext";

const IDLE_SUGGESTIONS = ["I'm wiped, no idea what to cook", "Scan my fridge", "What can I make tonight?"];
const COOKING_SUGGESTIONS = ["Next step", "Repeat that", "Go back"];

export function ChatThread({ className }: { className?: string }) {
  const transcript = useVoice((s) => s.transcript);
  const thinking = useVoice((s) => s.status === "thinking");
  const persona = usePersona();
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = transcript[transcript.length - 1]?.id;

  // Keyed on the last line's id, not the length: the store caps the transcript at 60 lines.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [lastId, thinking]);

  return (
    <div ref={scroller} className={cn("no-scrollbar overflow-y-auto overscroll-contain", className)}>
      {transcript.length === 0 && !thinking ? (
        <EmptyThread persona={persona} />
      ) : (
        <div className="flex flex-col gap-2.5 px-5 pb-4 pt-[14px]" aria-live="polite" aria-relevant="additions">
          {transcript.map((line) => (
            <Line key={line.id} line={line} persona={persona} />
          ))}
          {thinking && (
            <div className="flex w-full items-end gap-2">
              <MascotAvatar persona={persona} size={28} />
              <img
                src="/figma/v2/2014-814/frame.svg"
                alt={`${persona.name} is typing`}
                role="status"
                width={61}
                height={37}
                className="block h-[37px] w-[61px] animate-pulse"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ line, persona }: { line: TranscriptLine; persona: Persona }) {
  if (line.role === "user") {
    return (
      <div className="flex w-full items-start justify-end animate-fade-up">
        <p className="max-w-[84%] whitespace-pre-line rounded-[18px] rounded-tr-[6px] bg-accent px-3.5 py-2.5 text-sm leading-[1.4] text-white">
          {line.text}
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="flex w-full items-end gap-2 animate-fade-up">
        <MascotAvatar persona={persona} size={28} />
        {/* Figma: 250px of text in a 14px-padded bubble */}
        <p className="min-w-0 max-w-[280px] whitespace-pre-line rounded-[18px] rounded-tl-[6px] border border-line bg-surface px-3.5 py-2.5 text-sm leading-[1.4] text-ink">
          {line.text}
        </p>
      </div>
      {line.recipeId ? <RecipeCard id={line.recipeId} /> : null}
    </>
  );
}

/** "25 min · 540 kcal · Cook the Story" (the recipe's source; its difficulty when there's none) */
function recipeMeta(recipe: Recipe): string {
  const minutes = recipe.readyInMinutes || 0;
  const steps = recipe.steps.length;
  const level = minutes <= 30 && steps <= 8 ? "Easy" : minutes <= 60 && steps <= 12 ? "Medium" : "Involved";
  const parts: string[] = [];
  if (minutes) parts.push(`${minutes} min`);
  const kcal = recipe.nutrition?.calories;
  if (kcal) parts.push(`${Math.round(kcal)} kcal`);
  parts.push(recipe.sourceName?.trim() || level);
  return parts.join(" · ");
}

/** Figma 1.3 inline recipe card: 76px photo (radius 14), title, meta, Start cooking + "+2 to list". */
function RecipeCard({ id }: { id: number }) {
  const ref = useRecipeRef(id);
  const { go } = useCallNav();
  if (!ref) return null;
  const { recipe, missing } = ref;

  // Cooking mode loads the recipe from its id (and keeps your place if it's the one in progress).
  const startCooking = () => go(cookHref(recipe.id));

  return (
    <div className="flex w-full items-center gap-3 rounded-tile border border-line bg-surface py-2.5 pl-2.5 pr-3 animate-fade-up">
      <SmartImage src={recipe.image} alt="" className="size-[76px] shrink-0 rounded-thumb" />
      <div className="flex min-w-px flex-1 flex-col items-start gap-1.5">
        <p className="line-clamp-2 w-full text-body font-semibold text-ink">{recipe.title}</p>
        <p className="w-full truncate text-xs text-ink-soft">{recipeMeta(recipe)}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={startCooking}
            className="whitespace-nowrap rounded-pill bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Start cooking
          </button>
          {missing && missing.length > 0 && (
            <button
              type="button"
              onClick={() => go(groceriesHref(recipe.id))}
              aria-label={`Add ${missing.length} missing ${missing.length === 1 ? "ingredient" : "ingredients"} to your grocery list`}
              className="whitespace-nowrap rounded-pill border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-cream active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              +{missing.length} to list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Empty state: the persona (a mascot is welcome here) and a few things to say */
function EmptyThread({ persona }: { persona: Persona }) {
  const cooking = useKitchen((s) => !!s.activeRecipe && s.finishedRecipeId !== s.activeRecipe.id);
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 py-10 text-center animate-fade-up">
      <MascotAvatar persona={persona} size={56} />
      <p className="text-sm text-ink-soft">Type to {persona.name}. Replies are spoken too.</p>
      <div className="flex flex-wrap justify-center gap-2">
        {(cooking ? COOKING_SUGGESTIONS : IDLE_SUGGESTIONS).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              unlockAudio();
              void handleUserText(s);
            }}
            className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-4 text-meta font-medium text-ink transition hover:bg-cream-deep active:scale-95"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
