"use client";

import { WifiOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useToast } from "@/lib/stores/toast";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      {icon && <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="max-w-[260px] text-sm text-ink-soft">{body}</p>}
      {action}
    </div>
  );
}

/** Small honest hint that a fallback (cache / canned answer) was used */
export function FallbackNote({ show, children = "Offline mode: showing saved results" }: { show: boolean; children?: ReactNode }) {
  if (!show) return null;
  return (
    <p className="inline-flex items-center gap-1.5 rounded-pill bg-butter-soft px-3 py-1 text-xs font-medium text-[#8a6410]">
      <WifiOff className="size-3.5" />
      {children}
    </p>
  );
}

/** Image with a soft placeholder while loading and a fallback on error */
export function SmartImage({
  src,
  alt,
  className,
  fallback = "/placeholder-dish.svg",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("relative block overflow-hidden bg-cream-deep", !loaded && "skeleton", className)}>
      <img
        src={failed || !src ? fallback : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </span>
  );
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+12px)] z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto max-w-[340px] rounded-pill px-4 py-2.5 text-sm font-medium shadow-lift animate-fade-up",
            t.tone === "success" && "bg-herb text-white",
            t.tone === "warning" && "bg-butter text-ink",
            t.tone === "default" && "bg-ink text-white",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
