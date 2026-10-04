"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { EstimateCard } from "@/components/cooking/snap/EstimateCard";
import { LoggedCard } from "@/components/cooking/snap/LoggedCard";
import { EstimateSkeleton, ScanningPhoto } from "@/components/cooking/snap/ScanningPhoto";
import { CookedRecipeCard, MealPhoto, SnapViewfinder } from "@/components/cooking/snap/SnapPrompt";
import { PhotoPicker } from "@/components/ui/PhotoPicker";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { say } from "@/lib/cooking/actions";
import { draftNutrition, patchDraft, toDraft, type EstimateDraft } from "@/lib/cooking/draft";
import { fallbackEstimate, sanitizeEstimate } from "@/lib/cooking/meal";
import { TIMEOUTS } from "@/lib/config";
import { postJSON } from "@/lib/http";
import { thumbnailFromDataUrl, toImageInput } from "@/lib/image";
import { getCachedRecipe } from "@/lib/recipes/catalog";
import { useDiary } from "@/lib/stores/diary";
import { useKitchen } from "@/lib/stores/kitchen";
import { useSocial } from "@/lib/stores/social";
import { toast } from "@/lib/stores/toast";
import type { MealEstimate, MealEstimateRequest, MealEstimateResponse, MealType, Nutrition, Recipe } from "@/lib/types";
import { mealForNow, todayISO } from "@/lib/utils";

/** Real plated-meal photo on an allow-listed host, for "Use sample photo" without a recipe */
const GENERIC_SAMPLE_MEAL = "https://img.spoonacular.com/recipes/716429-556x370.jpg";
/** Keep the scan animation on screen long enough to read, even when the answer is instant */
const MIN_SCAN_MS = 900;

type Phase = "pick" | "estimating" | "review" | "logged";

interface Logged {
  name: string;
  image?: string;
  meal: MealType;
  nutrition: Nutrition;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}

/** The recipe that was just cooked: finishedRecipeId, else the active recipe */
function useCookedRecipe(): Recipe | null {
  const finishedId = useKitchen((s) => s.finishedRecipeId);
  const active = useKitchen((s) => s.activeRecipe);
  return useMemo(() => {
    const id = finishedId ?? active?.id ?? null;
    if (id == null) return null;
    if (active?.id === id) return active;
    return getCachedRecipe(id) ?? null;
  }, [finishedId, active]);
}

export default function SnapPage() {
  const router = useRouter();
  const cooked = useCookedRecipe();
  const [otherMeal, setOtherMeal] = useState(false);
  const recipe = otherMeal ? null : cooked;

  const [phase, setPhase] = useState<Phase>("pick");
  const [photo, setPhoto] = useState<string | null>(null);
  const [draft, setDraft] = useState<EstimateDraft | null>(null);
  const [result, setResult] = useState<{ source: MealEstimateResponse["source"]; confidence: MealEstimate["confidence"] } | null>(null);
  const [meal, setMeal] = useState<MealType>(() => mealForNow());
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState<Logged | null>(null);
  const requestId = useRef(0);

  // Leaving the screen cancels a pending estimate (no late speech or state updates).
  useEffect(() => {
    const ref = requestId;
    return () => {
      ref.current++;
    };
  }, []);

  async function estimate(src: string) {
    const req = ++requestId.current;
    setPhoto(src);
    setDraft(null);
    setPhase("estimating");
    const started = Date.now();

    const recipeFallback = fallbackEstimate(recipe, recipe?.title);
    let estimateResult: MealEstimate = recipeFallback;
    let source: MealEstimateResponse["source"] = "fallback";
    try {
      const body: MealEstimateRequest = { image: toImageInput(src), recipeId: recipe?.id, dishHint: recipe?.title };
      const res = await postJSON<MealEstimateResponse>("/api/vision/meal", body, { timeoutMs: TIMEOUTS.vision });
      if (res?.estimate) {
        source = res.source === "gemini" ? "gemini" : "fallback";
        // A server fallback may not know a live recipe's nutrition; ours might.
        estimateResult = source === "fallback" && recipe?.nutrition ? recipeFallback : sanitizeEstimate(res.estimate, recipeFallback);
      }
    } catch {
      // Offline / timeout: keep the local fallback.
    }

    const wait = MIN_SCAN_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (req !== requestId.current) return; // retaken or left meanwhile

    setDraft(toDraft(estimateResult));
    setResult({ source, confidence: estimateResult.confidence });
    setPhase("review");
    say(
      source === "gemini"
        ? `That looks like ${estimateResult.dishName}, about ${estimateResult.calories} calories. Check the numbers, then log it.`
        : `I estimated about ${estimateResult.calories} calories. Adjust anything, then log it.`,
    );
  }

  function retake() {
    requestId.current++;
    setPhoto(null);
    setDraft(null);
    setResult(null);
    setPhase("pick");
  }

  async function log() {
    if (!draft || logging) return;
    setLogging(true);
    try {
      const nutrition = draftNutrition(draft);
      const name = draft.dishName.trim() || recipe?.title || "Home-cooked meal";
      const portion = draft.portion.trim() || "1 serving";

      // Diary lives in localStorage: store a small thumbnail, never the full photo.
      let image: string | undefined = photo ?? undefined;
      if (photo?.startsWith("data:")) {
        try {
          image = await withTimeout(thumbnailFromDataUrl(photo), 5000);
        } catch {
          image = photo.length < 250_000 ? photo : undefined;
        }
      }

      useDiary.getState().addEntry({
        date: todayISO(),
        meal,
        name,
        portion,
        nutrition,
        image,
        recipeId: recipe?.id,
        source: "ai",
        estimated: true,
      });
      toast("Logged to your diary", "success");
      say(`Logged! ${name}, ${nutrition.calories} calories, added to your ${meal}.`);
      setLogged({ name, image, meal, nutrition });
      setPhase("logged");
      document.getElementById("sous-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast("Couldn't save that. Try again?", "warning");
    } finally {
      setLogging(false);
    }
  }

  function share() {
    if (!logged) return;
    useSocial.getState().setDraft({
      image: logged.image ?? photo ?? recipe?.image ?? "/placeholder-dish.svg",
      dishName: logged.name,
      recipeId: recipe?.id,
    });
    router.push("/social/new");
  }

  const fallbackText = recipe?.nutrition
    ? "Gemini was busy: using the recipe's per-serving numbers"
    : "Gemini was busy: this is a typical plate, adjust as needed";

  return (
    <div className="pb-nav">
      <ScreenHeader
        back={cooked ? `/ai/cook/${cooked.id}` : "/ai"}
        title="How did it turn out?"
        subtitle={recipe ? recipe.title : "Snap any meal"}
      />

      <div className="flex flex-col gap-5 px-5 pt-1">
        {phase === "pick" && (
          <>
            {recipe && <CookedRecipeCard recipe={recipe} onClear={() => setOtherMeal(true)} />}
            <SnapViewfinder />
            <PhotoPicker
              onPick={(src) => void estimate(src)}
              sampleSrc={recipe?.image || GENERIC_SAMPLE_MEAL}
              sampleLabel="Use sample photo"
              className="animate-fade-up [animation-delay:120ms]"
            />
          </>
        )}

        {phase === "estimating" && photo && (
          <>
            <ScanningPhoto src={photo} />
            <EstimateSkeleton />
          </>
        )}

        {phase === "review" && photo && draft && result && (
          <>
            <MealPhoto src={photo} onRetake={retake} />
            <EstimateCard
              draft={draft}
              onChange={(patch) => setDraft((d) => (d ? patchDraft(d, patch) : d))}
              meal={meal}
              onMealChange={setMeal}
              source={result.source}
              confidence={result.confidence}
              fallbackText={fallbackText}
              onLog={() => void log()}
              logging={logging}
            />
          </>
        )}

        {phase === "logged" && logged && (
          <LoggedCard
            name={logged.name}
            image={logged.image}
            meal={logged.meal}
            nutrition={logged.nutrition}
            onShare={share}
            onViewDiary={() => router.push(`/diary/${todayISO()}`)}
          />
        )}
      </div>
    </div>
  );
}
