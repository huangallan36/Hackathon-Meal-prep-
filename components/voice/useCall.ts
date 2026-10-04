"use client";

/** Small hooks shared by the call screen (talking + typing views) and the docked live activity. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDock } from "@/lib/stores/dock";
import { useVoice } from "@/lib/stores/voice";
import { getPreviousPath } from "@/lib/voice/context";
import { endSession } from "@/lib/voice/engine";

/** "04:12" since the call started ("1:02:09" past an hour); "00:00" with no session */
export function formatCallTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${String(m).padStart(2, "0")}:${s}`;
}

/** Live call duration, ticking every second while a session runs */
export function useCallTimer(): string {
  const startedAt = useVoice((s) => s.sessionStartedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? formatCallTime(now - startedAt) : "00:00";
}

/** Leave the call screen without hanging up, or hang up. */
export function useCallNav() {
  const router = useRouter();

  /** The session keeps running: Sous docks as a bubble over the (demo) home screen. */
  function minimize() {
    useDock.getState().dock();
    // Underneath, the app goes back to where you were, so leaving the bubble lands there.
    const prev = getPreviousPath();
    if (prev && prev !== "/ai/talk") router.back();
    else router.push("/ai");
  }

  function hangUp() {
    endSession();
    router.push("/ai");
  }

  /** Open another screen mid-call (quick actions, recipe card): the session keeps running. */
  function go(href: string) {
    // Typing belongs to this screen; elsewhere it would pop the type sheet open.
    useVoice.getState().setTyping(false);
    router.push(href);
  }

  return { minimize, hangUp, go };
}
