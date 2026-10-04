"use client";

/**
 * Kitchen-timer chime: three short rising sine beeps through Web Audio (no audio file to
 * load, works offline). Browsers only allow audio after a user gesture, so primeChime()
 * is called from the tap that starts a timer; every call is guarded and never throws.
 */
type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
    ctx = AC ? new AC() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Call inside a tap handler so the chime is allowed to play later. */
export function primeChime(): void {
  const c = audioContext();
  if (c?.state === "suspended") c.resume().catch(() => {});
}

export function playChime(): void {
  const c = audioContext();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume().catch(() => {});
    const notes = [880, 1108.7, 1318.5]; // A5, C#6, E6: a bright major arpeggio
    const start = c.currentTime + 0.05;
    notes.forEach((freq, i) => {
      const t = start + i * 0.26;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  } catch {
    /* audio is a nice-to-have */
  }
}

export function buzz(): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([180, 90, 180, 90, 180]);
  } catch {
    /* ignore */
  }
}
