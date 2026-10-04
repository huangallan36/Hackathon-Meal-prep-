"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const HUES = ["#f2542d", "#3f8f5b", "#f6c350", "#6a8de0", "#e8664a", "#4fa36b", "#b06ad8", "#2fa5a5"];

/** Avatar image with an initials fallback if the file is missing */
export function Avatar({ src, name, size = 40, className }: { src?: string; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const hue = HUES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-deep", className)}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        <img src={src} alt="" width={size} height={size} className="size-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span
          className="flex size-full items-center justify-center font-semibold text-white"
          style={{ background: hue, fontSize: size * 0.38 }}
        >
          {initials}
        </span>
      )}
    </span>
  );
}
