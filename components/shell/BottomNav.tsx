"use client";

import { ChefHat, NotebookPen, UsersRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SIDE_TABS = {
  diary: { href: "/diary", label: "Diary", Icon: NotebookPen },
  social: { href: "/social", label: "Social", Icon: UsersRound },
} as const;

export function BottomNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/diary") ? "diary" : pathname.startsWith("/social") ? "social" : "ai";

  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-40 h-[calc(var(--nav-height)+var(--safe-bottom))] rounded-t-[28px] border-t border-line bg-surface/95 pb-[var(--safe-bottom)] shadow-[0_-10px_30px_-18px_rgb(70_35_10/0.35)] backdrop-blur"
    >
      <div className="grid h-[var(--nav-height)] grid-cols-3 items-center px-6">
        <SideTab tab="diary" active={active === "diary"} />

        <div className="flex justify-center">
          <Link
            href="/ai"
            aria-label="AI sous chef"
            aria-current={active === "ai" ? "page" : undefined}
            className={cn(
              "-mt-9 flex size-[68px] flex-col items-center justify-center rounded-full border-[5px] border-cream text-white transition active:scale-95",
              "bg-[radial-gradient(circle_at_30%_25%,#ff8a5c,#f2542d_55%,#c93c18)] shadow-accent",
              active !== "ai" && "saturate-[0.85]",
            )}
          >
            <ChefHat className="size-7" strokeWidth={2.2} />
          </Link>
          <span className="sr-only">AI</span>
        </div>

        <SideTab tab="social" active={active === "social"} />
      </div>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-[50px] -translate-x-1/2 text-[11px] font-semibold",
          active === "ai" ? "text-accent" : "text-ink-faint",
        )}
      >
        AI
      </span>
    </nav>
  );
}

function SideTab({ tab, active }: { tab: keyof typeof SIDE_TABS; active: boolean }) {
  const { href, label, Icon } = SIDE_TABS[tab];
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 justify-self-center rounded-tile px-4 py-1.5 text-[11px] font-semibold transition active:scale-95",
        active ? "text-accent" : "text-ink-faint hover:text-ink-soft",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
