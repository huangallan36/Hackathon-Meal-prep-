"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GlobalTimer } from "@/components/cooking/GlobalTimer";
import { FloatingOrb } from "@/components/orb/FloatingOrb";
import { Toaster } from "@/components/ui/Misc";
import { BottomNav } from "./BottomNav";

/** Screens that take over the whole phone (no bottom nav) */
const FULLSCREEN = ["/ai/talk"];

/**
 * The phone. On desktop: a centered 390x844 device frame. On a real phone: full screen.
 * The frame has `transform` set, so any `position: fixed` element inside it is positioned
 * relative to the phone, not the browser window. Screens can use `fixed` safely.
 *
 * Children render only after mount: every store is persisted to localStorage, and
 * rendering after hydration avoids server/client mismatches across the whole app.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only gate
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.getElementById("sous-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);

  const fullscreen = FULLSCREEN.includes(pathname);

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-cream sm:bg-[radial-gradient(circle_at_20%_10%,#ffe9dc,transparent_45%),radial-gradient(circle_at_85%_90%,#fff1c9,transparent_40%),#f6ece1] sm:p-6">
      <div
        id="sous-phone"
        className="relative h-dvh w-full overflow-hidden bg-cream [transform:translateZ(0)] sm:h-[min(844px,calc(100dvh-48px))] sm:w-[390px] sm:rounded-phone sm:shadow-phone sm:[--safe-bottom:12px] sm:[--safe-top:34px]"
      >
        <StatusBar />
        <main id="sous-scroll" className="no-scrollbar absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
          {mounted ? children : <Splash />}
        </main>
        {mounted && <GlobalTimer />}
        {mounted && <FloatingOrb />}
        {mounted && !fullscreen && <BottomNav />}
        <Toaster />
        <span className="pointer-events-none absolute bottom-1.5 left-1/2 z-50 hidden h-[5px] w-32 -translate-x-1/2 rounded-full bg-ink/80 sm:block" />
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="size-16 animate-pulse rounded-full bg-[radial-gradient(circle_at_30%_25%,#ffb08a,#f2542d_60%,#c93c18)] shadow-accent" />
      <p className="font-display text-2xl font-semibold text-ink">Sous</p>
    </div>
  );
}

/** Fake iOS status bar, desktop frame only */
function StatusBar() {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, ""));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 hidden h-[34px] items-center justify-between px-8 pt-1 text-[13px] font-semibold text-ink sm:flex">
      <span>{time}</span>
      <span className="absolute left-1/2 top-2 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-ink" />
      <span className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden>
          <rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="currentColor" opacity=".4" />
          <rect x="2" y="2" width="16" height="8" rx="1.6" fill="currentColor" />
          <rect x="22.5" y="4" width="1.8" height="4" rx="0.9" fill="currentColor" opacity=".4" />
        </svg>
      </span>
    </div>
  );
}
