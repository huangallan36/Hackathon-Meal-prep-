"use client";

import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cookFromPost } from "@/lib/social/client";
import { cn } from "@/lib/utils";

/**
 * "Cook this": loads the post's recipe into cooking mode. Safe inside draggable cards.
 * Figma primary pill (green): sm = the 30px in-card action ("Start cooking"), md = 48px.
 */
export function CookThisButton({
  recipeId,
  size = "sm",
  full,
  className,
}: {
  recipeId?: number;
  size?: "sm" | "md" | "lg";
  full?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    const opened = await cookFromPost(recipeId, (href) => router.push(href));
    // On success the page navigates away; keep the spinner until it does.
    if (!opened) setBusy(false);
  }

  return (
    <Button
      size={size}
      full={full}
      loading={busy}
      icon={<ChefHat className={size === "sm" ? "size-3.5" : "size-[18px]"} strokeWidth={1.9} />}
      data-no-drag
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => void handleClick()}
      // The 30px pill keeps a 46px tap target via ::after (same trick as IconButton).
      className={cn("relative shrink-0", size === "sm" && "after:absolute after:-inset-2 after:content-['']", className)}
    >
      Cook this
    </Button>
  );
}
