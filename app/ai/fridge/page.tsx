"use client";

import { ArrowRight, Camera, Keyboard, Lightbulb, RefreshCw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FridgeHero } from "@/components/kitchen/FridgeHero";
import { IngredientEditor } from "@/components/kitchen/IngredientEditor";
import { ScanningPhoto } from "@/components/kitchen/ScanningPhoto";
import { StickyAction } from "@/components/kitchen/StickyAction";
import { Button } from "@/components/ui/Button";
import { FallbackNote, SmartImage } from "@/components/ui/Misc";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { fetchMatches, fridgeThumbnail, sayIfSession, scanFridge, wait } from "@/lib/kitchen/client";
import { fridgeLine } from "@/lib/kitchen/format";
import { SAMPLE_FRIDGE_PHOTO } from "@/lib/sample";
import { useKitchen } from "@/lib/stores/kitchen";

type Phase = "pick" | "scanning" | "results";

/** Keep the scan animation on screen long enough to read, even when the answer is instant */
const MIN_SCAN_MS = 1400;

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * Existing chips open straight into the results step, unless the caller asked for a
 * fresh scan with /ai/fridge?scan=1 (e.g. Gemini's open_fridge_camera action).
 */
function initialPhase(): Phase {
  const forceScan = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("scan");
  return !forceScan && useKitchen.getState().ingredients.length > 0 ? "results" : "pick";
}

export default function FridgePage() {
  const router = useRouter();
  const ingredients = useKitchen((s) => s.ingredients);
  const source = useKitchen((s) => s.ingredientsSource);
  const storedPhoto = useKitchen((s) => s.fridgePhoto);
  const addIngredient = useKitchen((s) => s.addIngredient);
  const removeIngredient = useKitchen((s) => s.removeIngredient);

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [scanSrc, setScanSrc] = useState<string | null>(null);
  const [focusInput, setFocusInput] = useState(false);

  /** Bumped on every new scan / cancel so a stale scan can't overwrite a newer choice */
  const scanToken = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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
    setPhase("results");
    sayIfSession(fridgeLine(result.ingredients));
  }

  function cancelScan() {
    scanToken.current++;
    setPhase(useKitchen.getState().ingredients.length > 0 ? "results" : "pick");
  }

  function typeInstead() {
    scanToken.current++;
    const kitchen = useKitchen.getState();
    kitchen.setIngredients([], "manual");
    kitchen.setFridgePhoto(null);
    setScanSrc(null);
    setFocusInput(true);
    setPhase("results");
  }

  function findRecipes() {
    // Warm the request; /ai/recipes reuses the in-flight promise and the stored result.
    void fetchMatches(useKitchen.getState().ingredients);
    router.push("/ai/recipes");
  }

  const photo = scanSrc ?? storedPhoto;

  return (
    <>
      <ScreenHeader title="What's in your fridge?" back />

      <div className="px-5 pb-nav">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "pick" && (
            <motion.section key="pick" {...fade} className="flex flex-col gap-5 pt-2">
              <div className="relative overflow-hidden rounded-card bg-surface px-5 pb-6 pt-4 shadow-card">
                <FridgeHero className="mx-auto block h-44 w-[218px]" />
                <h2 className="mt-2 text-center font-display text-[26px] font-semibold leading-tight text-ink">Show me your fridge</h2>
                <p className="mx-auto mt-2 max-w-[280px] text-center text-[15px] leading-relaxed text-ink-soft">
                  Snap one photo and Gemini will spot what you can cook with. It only takes a few seconds.
                </p>
              </div>

              <PhotoPicker onPick={(src) => void handlePick(src)} sampleSrc={SAMPLE_FRIDGE_PHOTO} />

              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>

              <Button variant="ghost" full icon={<Keyboard className="size-5" />} onClick={typeInstead}>
                Type ingredients instead
              </Button>

              {ingredients.length > 0 && (
                <Button variant="ghost" full icon={<ArrowRight className="size-5" />} onClick={() => setPhase("results")}>
                  Back to my {ingredients.length} ingredients
                </Button>
              )}

              <p className="flex items-start gap-2.5 rounded-tile bg-butter-soft px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-ink" />
                Open the door wide and step back so every shelf is in the frame.
              </p>
            </motion.section>
          )}

          {phase === "scanning" && scanSrc && (
            <motion.section key="scanning" {...fade} className="flex flex-col gap-4 pt-2">
              <ScanningPhoto src={scanSrc} />
              <Button variant="ghost" icon={<X className="size-4" />} onClick={cancelScan} className="self-center">
                Cancel
              </Button>
            </motion.section>
          )}

          {phase === "results" && (
            <motion.section key="results" {...fade} className="flex flex-col gap-6 pt-2">
              <ResultsHeader
                count={ingredients.length}
                manual={source === "manual"}
                photo={photo}
                onRescan={() => setPhase("pick")}
              />
              <FallbackNote show={source === "fallback"}>Showing a sample scan. Edit it to match your fridge.</FallbackNote>
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

      {phase === "results" && (
        <StickyAction>
          <Button
            size="lg"
            full
            icon={<Sparkles className="size-5" />}
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

function ResultsHeader({
  count,
  manual,
  photo,
  onRescan,
}: {
  count: number;
  manual: boolean;
  photo: string | null;
  onRescan: () => void;
}) {
  const title = manual
    ? count === 0
      ? "What do you have?"
      : `${count} ingredient${count === 1 ? "" : "s"} so far`
    : count === 0
      ? "Nothing left on the list"
      : `I spotted ${count} ingredient${count === 1 ? "" : "s"}`;
  const body = manual
    ? "Add a few things and I'll match recipes to them."
    : "Tap anything I got wrong to remove it, or add what I missed.";

  return (
    <div className="flex items-center gap-4">
      {photo && !manual ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -4 }}
          animate={{ scale: 1, opacity: 1, rotate: -3 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative shrink-0"
        >
          <SmartImage src={photo} alt="Your fridge" className="size-20 rounded-tile border-4 border-surface shadow-card" />
          <span className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-accent text-white shadow-accent">
            <Sparkles className="size-3.5" />
          </span>
        </motion.div>
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-tile bg-accent-soft text-accent">
          <Keyboard className="size-7" />
        </span>
      )}
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-semibold leading-tight text-ink" aria-live="polite">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-snug text-ink-soft">{body}</p>
        <button
          type="button"
          onClick={onRescan}
          className="-ml-1 mt-0.5 inline-flex min-h-11 items-center gap-1.5 rounded-pill px-1 text-sm font-semibold text-accent-strong transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {manual ? <Camera className="size-4" /> : <RefreshCw className="size-4" />}
          {manual ? "Scan a photo instead" : "Rescan"}
        </button>
      </div>
    </div>
  );
}
