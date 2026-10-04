"use client";

import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cookFromPost } from "@/lib/social/client";
import { cn } from "@/lib/utils";

/** "Cook this": loads the post's recipe into cooking mode. Safe inside draggable cards. */
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
      icon={<ChefHat className="size-4" />}
      data-no-drag
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => void handleClick()}
      className={cn("shrink-0", className)}
    >
      Cook this
    </Button>
  );
}
