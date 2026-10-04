"use client";

import { Refrigerator } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The scanned fridge photo with a skeleton while loading. If it can't load (e.g. the
 * sample file is missing), it shows a fridge tile instead of a broken image or an
 * unrelated dish placeholder. State is keyed by src so a new photo starts fresh.
 */
export function FridgePhoto({
  src,
  alt = "Your fridge",
  className,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  /** Shown when the image fails; defaults to a fridge icon */
  fallback?: ReactNode;
}) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;

  return (
    <span className={cn("relative block overflow-hidden bg-accent-soft", !loaded && !failed && "skeleton", className)}>
      {failed ? (
        <span role="img" aria-label={alt} className="flex size-full items-center justify-center text-accent">
          {fallback ?? <Refrigerator className="size-1/3 max-h-12 max-w-12" strokeWidth={1.75} />}
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </span>
  );
}
