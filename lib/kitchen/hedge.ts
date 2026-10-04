/**
 * Server-only. Hedged structured-output call across a Gemini model chain.
 *
 * Measured on the fridge prompt: the same model swings between ~1 s and 40+ s,
 * and an overloaded model can hang instead of returning 503. A sequential chain
 * burns its whole per-attempt timeout on that model, so instead we start the
 * first model, and if it has not answered within `staggerMs` we start the next
 * one in parallel (immediately on a hard error). First valid answer wins.
 * Worst case cost: one extra request per stagger window.
 */
import type { Part } from "@google/genai";
import { generateJSON } from "@/lib/server/gemini";

export interface HedgedOptions<T> {
  models: string[];
  parts: Part[];
  schema: Record<string, unknown>;
  systemInstruction?: string;
  /** Overall budget */
  timeoutMs: number;
  /** Head start each model gets before the next one joins */
  staggerMs: number;
  label: string;
  /** Reject an answer (e.g. empty list) so a slower model can still win */
  accept?: (data: T) => boolean;
}

export function hedgedJSON<T>(opts: HedgedOptions<T>): Promise<{ data: T; model: string }> {
  const deadline = Date.now() + opts.timeoutMs;

  return new Promise((resolve, reject) => {
    let next = 0;
    let running = 0;
    let settled = false;
    let lastError: unknown = new Error("Gemini timed out");
    let stagger: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(stagger);
      clearTimeout(overall);
      fn();
    };

    const overall = setTimeout(() => finish(() => reject(lastError)), opts.timeoutMs);

    const isAcceptable = (data: T) => {
      try {
        return !opts.accept || opts.accept(data);
      } catch {
        return false;
      }
    };

    const launch = () => {
      if (settled) return;
      clearTimeout(stagger);
      const remaining = deadline - Date.now();
      if (next >= opts.models.length || remaining < 800) {
        if (running === 0) finish(() => reject(lastError));
        return;
      }
      const index = next++;
      const model = opts.models[index];
      running++;
      generateJSON<T>({
        models: [model],
        parts: opts.parts,
        schema: opts.schema,
        systemInstruction: opts.systemInstruction,
        timeoutMs: remaining,
        label: `${opts.label}#${index}`,
      }).then(
        (result) => {
          if (isAcceptable(result.data)) return finish(() => resolve(result));
          running--;
          lastError = new Error(`${model} answer rejected`);
          launch();
        },
        (err: unknown) => {
          running--;
          lastError = err;
          launch(); // hard failure: hand over right away
        },
      );
      stagger = setTimeout(launch, opts.staggerMs);
    };

    launch();
  });
}
