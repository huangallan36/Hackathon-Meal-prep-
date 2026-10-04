"use client";

import { Camera, Mic, NotebookPen, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FallbackNote } from "@/components/ui/Misc";
import { Sheet } from "@/components/voice/Sheet";
import { cleanNumberInput } from "@/lib/cooking/draft";
import { estimateFoods, logFoods, type FoodEstimate } from "@/lib/diary/estimate";
import { FOOD_TEXT_MAX, scaleFood } from "@/lib/diary/food-estimate";
import { fmt, MEAL_LABEL } from "@/lib/diary/stats";
import { toast } from "@/lib/stores/toast";
import { useVoice } from "@/lib/stores/voice";
import type { ISODate, MealType, SpokenFood } from "@/lib/types";
import { cn } from "@/lib/utils";
import { stopSpeaking } from "@/lib/voice/engine";
import { isSttSupported, listenOnce, stopListening } from "@/lib/voice/stt";
import { MacroLine } from "./EntryBits";

/**
 * "Add to Lunch": describe what you had (type or dictate), Sous estimates each food,
 * you can correct the calories, then add them all to the diary. `open` + `meal` are
 * separate so the sheet keeps its title while it animates out.
 */
export function AddFoodSheet({
  open,
  meal,
  date,
  onClose,
}: {
  open: boolean;
  meal: MealType;
  date: ISODate;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`Add to ${MEAL_LABEL[meal]}`}>
      <AddFoodBody meal={meal} date={date} onDone={onClose} />
    </Sheet>
  );
}

interface DraftItem {
  item: SpokenFood;
  /** Calories as typed (string while editing) */
  kcal: string;
}

/** The item as it will be logged: an edited calorie count scales its macros and micros too */
function finalItem({ item, kcal }: DraftItem): SpokenFood {
  const k = Number.parseInt(kcal, 10);
  if (!Number.isFinite(k) || k === item.calories) return item;
  if (item.calories > 0) return scaleFood(item, k / item.calories);
  return { ...item, calories: Math.min(10_000, Math.max(0, k)) };
}

function AddFoodBody({ meal, date, onDone }: { meal: MealType; date: ISODate; onDone: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<{ items: DraftItem[]; source: FoodEstimate["source"] } | null>(null);
  const [listening, setListening] = useState(false);
  const [canDictate] = useState(() => isSttSupported());
  const interim = useVoice((s) => s.interim);
  const requestId = useRef(0);
  const alive = useRef(true);
  const ownsMic = useRef(false);

  // Closing the sheet drops a pending estimate and closes our mic (never someone else's).
  useEffect(() => {
    const req = requestId;
    const live = alive;
    const mic = ownsMic;
    live.current = true;
    return () => {
      live.current = false;
      req.current++;
      if (mic.current) stopListening();
    };
  }, []);

  async function dictate() {
    if (listening) {
      stopListening();
      return;
    }
    stopSpeaking();
    const wasTyping = useVoice.getState().typing;
    setListening(true);
    ownsMic.current = true;
    try {
      const heard = await listenOnce();
      // A blocked mic opens the voice typing sheet; this sheet already has a text field.
      if (!wasTyping && useVoice.getState().typing) useVoice.getState().setTyping(false);
      if (!alive.current || !heard) return;
      setText((prev) => (prev.trim() ? `${prev.trim()}, ${heard}` : heard).slice(0, FOOD_TEXT_MAX));
      setResult(null);
    } catch {
      // listenOnce never rejects; nothing to do
    } finally {
      ownsMic.current = false;
      if (alive.current) setListening(false);
    }
  }

  async function estimate() {
    const description = text.trim();
    if (!description || estimating) return;
    if (listening) stopListening();
    const req = ++requestId.current;
    setEstimating(true);
    const res = await estimateFoods(description, meal);
    if (req !== requestId.current || !alive.current) return;
    setEstimating(false);
    if (!res.items.length) {
      toast("Couldn't find any food in that. Try again?", "warning");
      return;
    }
    setResult({ items: res.items.map((item) => ({ item, kcal: String(item.calories) })), source: res.source });
  }

  function setKcal(index: number, raw: string) {
    setResult((r) => (r ? { ...r, items: r.items.map((d, i) => (i === index ? { ...d, kcal: cleanNumberInput(raw, true) } : d)) } : r));
  }

  function remove(index: number) {
    setResult((r) => {
      if (!r) return r;
      const items = r.items.filter((_, i) => i !== index);
      return items.length ? { ...r, items } : null;
    });
  }

  function add() {
    if (!result) return;
    const items = result.items.map(finalItem).filter((f) => f.calories > 0 || f.protein + f.carbs + f.fat > 0);
    if (!items.length) {
      toast("Add a calorie amount first.", "warning");
      return;
    }
    const logged = logFoods(items, meal, date);
    if (!logged.length) {
      toast("Couldn't save that. Try again?", "warning");
      return;
    }
    toast(`Added to ${MEAL_LABEL[meal]}`, "success");
    onDone();
  }

  const finals = result?.items.map(finalItem) ?? [];
  const total = finals.reduce((a, f) => a + f.calories, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-what`} className="mb-2 block text-sm font-semibold text-ink">
          What did you have?
        </label>
        <div className="flex items-start gap-2">
          <textarea
            id={`${id}-what`}
            value={listening && interim ? `${text ? `${text}, ` : ""}${interim}` : text}
            onChange={(e) => {
              setText(e.target.value.replace(/[\r\n]+/g, " ").slice(0, FOOD_TEXT_MAX));
              if (result) setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void estimate();
              }
            }}
            readOnly={listening}
            rows={2}
            maxLength={FOOD_TEXT_MAX}
            placeholder="e.g. chicken wrap and a latte"
            className="min-h-[52px] min-w-0 flex-1 resize-none rounded-tile border border-line bg-cream/60 px-3.5 py-3 text-base leading-snug text-ink outline-none transition placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {canDictate && (
            <button
              type="button"
              onClick={() => void dictate()}
              aria-label={listening ? "Stop dictation" : "Dictate what you had"}
              aria-pressed={listening}
              className={cn(
                "relative inline-flex size-[52px] shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flame focus-visible:ring-offset-2",
                listening ? "bg-ink" : "bg-flame hover:opacity-90",
              )}
            >
              {listening && <span className="absolute inset-0 animate-ping rounded-full bg-flame/40" aria-hidden />}
              {listening ? <Square className="relative size-4 fill-current" /> : <Mic className="size-5" />}
            </button>
          )}
        </div>
        <p className="mt-1.5 min-h-4 px-1 text-xs text-ink-faint" aria-live="polite">
          {listening ? "Listening... tap stop when you're done." : "Separate foods with commas or \"and\". Amounts help."}
        </p>
      </div>

      {!result && (
        <Button full size="lg" onClick={() => void estimate()} loading={estimating} disabled={!text.trim() || listening} icon={<Sparkles className="size-5" />}>
          {estimating ? "Estimating..." : "Estimate with Sous"}
        </Button>
      )}

      {result && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">Sous estimated</p>
            <p className="text-sm font-semibold tabular-nums text-ink">
              {fmt(total)} <span className="text-xs font-medium text-ink-faint">kcal total</span>
            </p>
          </div>
          {result.source === "fallback" && (
            <div className="mt-2">
              <FallbackNote show>Rough estimate from Sous&apos;s food table</FallbackNote>
            </div>
          )}
          <ul className="mt-2 divide-y divide-line rounded-tile border border-line px-3">
            {result.items.map((d, i) => {
              const f = finals[i];
              return (
                <li key={`${i}-${d.item.name}`} className="flex items-center gap-2.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold leading-tight text-ink">{f.name}</p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-soft">{f.portion}</p>
                    <MacroLine n={f} className="mt-1" />
                  </div>
                  <label className="flex h-11 w-[88px] shrink-0 items-center gap-1 rounded-tile border border-line bg-cream/60 px-2 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                    <input
                      inputMode="numeric"
                      value={d.kcal}
                      onChange={(e) => setKcal(i, e.target.value)}
                      aria-label={`Calories for ${f.name}`}
                      className="w-full min-w-0 bg-transparent text-right text-base font-semibold tabular-nums text-ink outline-none"
                    />
                    <span className="text-[11px] font-medium text-ink-faint">kcal</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove ${f.name}`}
                    className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-faint transition hover:bg-cream-deep hover:text-ink active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-1 text-xs text-ink-faint">Vitamins and minerals are estimated too. Edit calories and the rest scales with them.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button full size="lg" onClick={add} icon={<NotebookPen className="size-5" />}>
              Add to diary
            </Button>
            <Button full variant="ghost" onClick={() => setResult(null)}>
              Change description
            </Button>
          </div>
        </div>
      )}

      <Link
        href="/ai/snap"
        onClick={onDone}
        className="mx-auto inline-flex h-11 items-center gap-1.5 rounded-pill px-4 text-sm font-semibold text-accent transition hover:bg-accent-soft active:scale-95"
      >
        <Camera className="size-4" />
        Snap a photo instead
      </Link>
    </div>
  );
}
