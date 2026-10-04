"use client";

import { ArrowRight, Camera, Keyboard, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { FridgePhoto } from "@/components/kitchen/FridgePhoto";
import { IngredientEditor } from "@/components/kitchen/IngredientEditor";
import { ScanningPhoto } from "@/components/kitchen/ScanningPhoto";
import { SousLine } from "@/components/kitchen/SousLine";
import { StickyAction } from "@/components/kitchen/StickyAction";
import { MascotFigure } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { FallbackNote } from "@/components/ui/Misc";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { PageTitle, ScreenHeader } from "@/components/ui/ScreenHeader";
import { fetchMatches, fridgeThumbnail, replaceQuery, sayWhenFree, scanFridge, wait } from "@/lib/kitchen/client";
import { fridgeLine } from "@/lib/kitchen/format";
import { RECIPES_HREF } from "@/lib/kitchen/routes";
import { SAMPLE_FRIDGE_PHOTO } from "@/lib/sample";
import { useKitchen } from "@/lib/stores/kitchen";
import { useVoice } from "@/lib/stores/voice";
import { usePersona } from "@/lib/voice/persona";

/*
 * Fridge scan (no Figma frame: built in the 2.x language). The empty camera step gets the
 * chosen voice's full-body mascot asking to see the fridge; once scanned, what Sous says sits
 * in its listening-banner style line above the editable ingredient chips.
 */

type Phase = "pick" | "scanning" | "results";

/** Shared Figma sparkle (white), on the green "Find recipes" button */
const ICON_SPARKLE = "/figma/icons/sparkle.svg";

/** Keep the scan animation on screen long enough to read, even when the answer is instant */
const MIN_SCAN_MS = 1400;

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

/** Which step to open on (see lib/kitchen/routes.ts for the query contract). */
function initialPhase(search: Pick<URLSearchParams, "has">): Phase {
  if (search.has("scan") || useKitchen.getState().ingredients.length === 0) return "pick";
  if (search.has("edit")) return "results";
  // In a voice session the way here is Gemini's open_fridge_camera action: show the camera,
  // not chips left over from an earlier run. "Back to my N ingredients" is one tap away.
  return useVoice.getState().sessionActive ? "pick" : "results";
}

// useSearchParams needs a Suspense boundary for prerendering.
export default function FridgePage() {
  return (
    <Suspense fallback={<ScreenHeader back />}>
      <FridgeScreen />
    </Suspense>
  );
}

function FridgeScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const ingredients = useKitchen((s) => s.ingredients);
  const source = useKitchen((s) => s.ingredientsSource);
  const storedPhoto = useKitchen((s) => s.fridgePhoto);
  const addIngredient = useKitchen((s) => s.addIngredient);
  const removeIngredient = useKitchen((s) => s.removeIngredient);

  const [phase, setPhase] = useState<Phase>(() => initialPhase(search));
  const [scanSrc, setScanSrc] = useState<string | null>(null);
  const [focusInput, setFocusInput] = useState(false);

  // A new ?scan=1 while this screen is open (e.g. "scan my fridge again") reopens the camera.
  const scanParam = search.get("scan");
  const [seenScanParam, setSeenScanParam] = useState(scanParam);
  if (scanParam !== seenScanParam) {
    setSeenScanParam(scanParam);
    if (scanParam !== null && phase === "results") setPhase("pick");
  }

  /** Bumped on every new scan / cancel so a stale scan can't overwrite a newer choice */
  const scanToken = useRef(0);
  const mounted = useRef(true);
  /** Cancels a pending "I can see..." line when the screen goes away */
  const cancelLine = useRef<() => void>(() => {});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelLine.current();
    };
  }, []);

  /** Show the chips, and make Back from /ai/recipes land here again (not on the camera). */
  function showResults() {
    setPhase("results");
    replaceQuery("edit=1");
  }

  async function handlePick(src: string) {
    const token = ++scanToken.current;
    setScanSrc(src);
    setPhase("scanning");

    const [result, thumb] = await Promise.all([scanFridge(src), fridgeThumbnail(src), wait(MIN_SCAN_MS)]);
    if (token !== scanToken.current) return;

    // Save even if the user navigated away mid-scan: the chips are ready when they come back.
    const kitchen = useKitchen.getState();
    kitchen.setIngredients(result.ingredients, result.source);
    kitchen.setFridgePhoto(thumb);
    if (!mounted.current) return;

    setFocusInput(false);
    showResults();
    cancelLine.current();
    cancelLine.current = sayWhenFree(fridgeLine(result.ingredients));
  }

  function cancelScan() {
    scanToken.current++;
    setScanSrc(null);
    if (useKitchen.getState().ingredients.length > 0) showResults();
    else setPhase("pick");
  }

  function typeInstead() {
    scanToken.current++;
    const kitchen = useKitchen.getState();
    kitchen.setIngredients([], "manual");
    kitchen.setFridgePhoto(null);
    setScanSrc(null);
    setFocusInput(true);
    showResults();
  }

  function findRecipes() {
    // Warm the request; /ai/recipes reuses the in-flight promise and the stored result.
    void fetchMatches(useKitchen.getState().ingredients);
    replaceQuery("edit=1");
    router.push(RECIPES_HREF);
  }

  const photo = scanSrc ?? storedPhoto;

  const manual = source === "manual";
  const persona = usePersona();

  return (
    <>
      <ScreenHeader back />

      {/* Figma text uses "normal" line height; children inherit it */}
      <div className="pb-nav leading-[normal]">
        <PageTitle
          title={phase === "results" ? (manual ? "Your ingredients" : "Your fridge") : "Scan your fridge"}
          // Once scanned, Sous says it in its own line below (with its mascot)
          subtitle={
            phase === "results" ? undefined : (
              <span className="text-sm leading-[normal]">{subtitleFor(phase, ingredients.length, manual)}</span>
            )
          }
          className="pt-0.5"
        />

        <div className="px-5 pt-5">
          <AnimatePresence mode="wait" initial={false}>
            {phase === "pick" && (
              <motion.section key="pick" {...fade} className="flex flex-col gap-4">
                <div className="rounded-card bg-surface p-2.5 shadow-card">
                  {/* Empty state: the chosen voice's full-body mascot (>= 120px), never over a photo */}
                  <div
                    className="flex h-[184px] items-end justify-center overflow-hidden rounded-tile"
                    style={{ backgroundColor: persona.soft }}
                  >
                    <MascotFigure persona={persona} state="speaking" width={136} label={persona.mascotLabel} />
                  </div>
                  <div className="px-1.5 pb-1.5 pt-3">
                    <h2 className="font-display text-section font-semibold text-ink">Show me your fridge</h2>
                    <p className="mt-1 text-sm leading-snug text-ink-soft">
                      Open the door wide and step back so every shelf is in the frame.
                    </p>
                  </div>
                </div>

                <PhotoPicker onPick={(src) => void handlePick(src)} sampleSrc={SAMPLE_FRIDGE_PHOTO} />

                <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>

                <div className="flex flex-col gap-1">
                  {ingredients.length > 0 && (
                    <Button variant="secondary" full icon={<ArrowRight className="size-5" />} onClick={showResults}>
                      Back to my {ingredients.length} ingredient{ingredients.length === 1 ? "" : "s"}
                    </Button>
                  )}
                  <Button variant="ghost" full icon={<Keyboard className="size-5" />} onClick={typeInstead}>
                    Type ingredients instead
                  </Button>
                </div>
              </motion.section>
            )}

            {phase === "scanning" && scanSrc && (
              <motion.section key="scanning" {...fade} className="flex flex-col gap-4">
                <ScanningPhoto src={scanSrc} />
                <Button variant="ghost" icon={<X className="size-4" />} onClick={cancelScan} className="self-center">
                  Cancel
                </Button>
              </motion.section>
            )}

            {phase === "results" && (
              <motion.section key="results" {...fade} className="flex flex-col gap-5">
                <SousLine className="-mt-2">{subtitleFor(phase, ingredients.length, manual)}</SousLine>
                <div className="flex flex-col gap-2">
                  <SourceRow
                    manual={manual}
                    sample={source === "fallback"}
                    photo={photo}
                    onRescan={() => setPhase("pick")}
                  />
                  {source === "fallback" && (
                    <div>
                      <FallbackNote show>Showing a sample scan. Edit it to match your fridge.</FallbackNote>
                    </div>
                  )}
                </div>
                <IngredientEditor
                  ingredients={ingredients}
                  onAdd={addIngredient}
                  onRemove={removeIngredient}
                  autoFocus={focusInput}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      {phase === "results" && (
        <StickyAction>
          <Button
            size="lg"
            full
            icon={<img src={ICON_SPARKLE} alt="" width={16} height={16} className="size-[18px]" />}
            disabled={ingredients.length === 0}
            onClick={findRecipes}
          >
            {ingredients.length === 0 ? "Add an ingredient" : "Find recipes"}
          </Button>
        </StickyAction>
      )}
    </>
  );
}

function subtitleFor(phase: Phase, count: number, manual: boolean): string {
  if (phase === "pick") return "One photo and Gemini spots what you can cook.";
  if (phase === "scanning") return "Hang tight, this takes a few seconds.";
  if (manual) {
    if (count === 0) return "Add a few things and I'll match recipes.";
    return `${count} ingredient${count === 1 ? "" : "s"} so far. Add more, or I'll find recipes now.`;
  }
  return count === 0 ? "Nothing left on the list. Add a few things." : `I spotted ${count} ingredient${count === 1 ? "" : "s"}. Fix anything I got wrong.`;
}

/** Figma 2.5 list-row shape: 60px thumb, title + meta, a link on the right */
function SourceRow({
  manual,
  sample,
  photo,
  onRescan,
}: {
  manual: boolean;
  sample: boolean;
  photo: string | null;
  onRescan: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-tile bg-surface py-2 pl-2 pr-3 shadow-card animate-fade-up">
      {photo && !manual ? (
        <FridgePhoto src={photo} className="size-[60px] shrink-0 rounded-thumb" />
      ) : (
        <span className="flex size-[60px] shrink-0 items-center justify-center rounded-thumb bg-accent-soft text-accent">
          <Keyboard className="size-6" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-semibold text-ink">
          {manual ? "Typed by you" : sample ? "Sample scan" : "Scanned with Gemini"}
        </span>
        <span className="mt-[3px] block truncate text-xs text-ink-soft">
          {manual ? "No photo yet" : sample ? "From the sample photo" : "From your photo"}
        </span>
      </span>
      <button
        type="button"
        onClick={onRescan}
        className="relative inline-flex shrink-0 items-center gap-1 text-meta font-semibold text-accent after:absolute after:-inset-3 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {manual ? <Camera className="size-3.5" /> : <RefreshCw className="size-3.5" />}
        {manual ? "Scan" : "Rescan"}
      </button>
    </div>
  );
}
