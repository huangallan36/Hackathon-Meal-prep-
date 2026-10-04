"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger" | "voice";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold [&_svg]:shrink-0 [&_img]:shrink-0 transition-[transform,background-color,box-shadow,opacity] duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

/** Figma: flat pills, no shadows. Primary is avocado; voice actions are tomato. */
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "bg-surface text-ink shadow-card hover:bg-cream-deep",
  soft: "bg-accent-soft text-accent hover:bg-[#dce7cd]",
  ghost: "bg-transparent text-ink-soft hover:bg-cream-deep",
  danger: "bg-flame text-white hover:opacity-90",
  voice: "bg-flame text-white hover:opacity-90",
};

/** Figma heights: small 30 (12px label), medium 48, large 56 ("Start talking", 16px label) */
const sizes: Record<Size, string> = {
  sm: "h-[30px] px-3.5 text-xs",
  md: "h-12 px-5 text-body",
  lg: "h-14 px-7 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  icon?: ReactNode;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  icon,
  loading,
  className,
  children,
  disabled,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(base, variants[variant], sizes[size], full && "w-full", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  full,
  icon,
  className,
  children,
  ...rest
}: Omit<CommonProps, "loading"> & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], full && "w-full", className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Figma header buttons: 40px white circles with no border; the ::after keeps a 48px tap target. */
const iconButtonClass =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink transition after:absolute after:-inset-1 after:content-[''] active:scale-95 hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/** Round icon-only button (back, close, more) */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
                iconButtonClass,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Link version of IconButton (same 40px white circle) */
export function IconLink({ label, className, children, ...rest }: { label: string } & ComponentProps<typeof Link>) {
  return (
    <Link aria-label={label} title={label} className={cn(iconButtonClass, className)} {...rest}>
      {children}
    </Link>
  );
}
