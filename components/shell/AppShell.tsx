"use client";

import { AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GlobalTimer } from "@/components/cooking/GlobalTimer";
import { PhoneHomeScreen } from "@/components/dock/PhoneHomeScreen";
import { FloatingOrb } from "@/components/orb/FloatingOrb";
import { Toaster } from "@/components/ui/Misc";
import { isDarkScreen, isFullscreen } from "@/lib/nav";
import { useDock } from "@/lib/stores/dock";
import { useVoice } from "@/lib/stores/voice";
import { cn } from "@/lib/utils";
import { BottomNav } from "./BottomNav";

/**
 * The phone. On desktop: a centered 390x844 device frame with the Figma status bar
 * and home indicator. On a real phone: full screen (the OS draws those).
 * The frame has `transform` set, so any `position: fixed` element inside it is positioned
 * relative to the phone, not the browser window. Screens can use `fixed` safely.
 *
 * Children render only after mount: every store is persisted to localStorage, and
 * rendering after hydration avoids server/client mismatches across the whole app.
 *
 * Docked (useDock): a pretend phone home screen covers the app, with Sous as a floating
 * bubble (above the screen, tab bar and floating orb; below sheets and toasts).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only gate
  useEffect(() => setMounted(true), []);
  const docked = useDock((s) => s.docked) && mounted;

  useEffect(() => {
    document.getElementById("sous-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);

  const fullscreen = isFullscreen(pathname);
  // The call screen is dark, except its light typing view (Figma 1.3)
  const talkTyping = useVoice((s) => s.typing) && pathname === "/ai/talk";
  const dark = (isDarkScreen(pathname) && !talkTyping) || docked;

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-cream sm:bg-[radial-gradient(circle_at_20%_10%,#fdfaf5,transparent_50%),radial-gradient(circle_at_85%_90%,#e2ede5,transparent_45%),#efe9df] sm:p-6">
      <div
        id="sous-phone"
        className="relative h-dvh w-full overflow-hidden bg-cream [transform:translateZ(0)] sm:h-[min(844px,calc(100dvh-48px))] sm:w-[390px] sm:rounded-phone sm:shadow-phone sm:[--safe-bottom:22px] sm:[--safe-top:50px]"
      >
        <StatusBar dark={dark} />
        <main
          id="sous-scroll"
          inert={docked}
          className="no-scrollbar absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {mounted ? children : <Splash />}
        </main>
        {mounted && <GlobalTimer />}
        {mounted && <FloatingOrb />}
        {mounted && !fullscreen && !docked && <BottomNav />}
        <AnimatePresence>{docked && <PhoneHomeScreen key="phone-home" />}</AnimatePresence>
        <Toaster />
        {/* Figma home indicator: 134x5, 8px from the bottom (desktop frame only) */}
        <span
          className={cn(
            "pointer-events-none absolute bottom-2 left-1/2 z-50 hidden h-[5px] w-[134px] -translate-x-1/2 rounded-[3px] sm:block",
            dark ? "bg-white/90" : "bg-ink",
          )}
        />
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <img src="/figma/voices/orb-maya.svg" alt="" width={46} height={46} className="size-16 animate-pulse" />
      <p className="font-display text-2xl font-semibold text-ink">Sous</p>
    </div>
  );
}

/** Figma "Status Bar" (2:26), desktop frame only. Light on cream, Dark on the call screen. */
function StatusBar({ dark }: { dark: boolean }) {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/, ""));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 hidden h-[50px] items-center justify-between pl-8 pr-[26px] pt-1.5 sm:flex",
        dark ? "text-white" : "text-ink",
      )}
    >
      <span className="text-base font-semibold leading-normal">{time}</span>
      <img
        src={dark ? "/figma/status/indicators-dark.svg" : "/figma/status/indicators-light.svg"}
        alt=""
        width={68}
        height={12}
        className="block h-3 w-[68px]"
      />
    </div>
  );
}
