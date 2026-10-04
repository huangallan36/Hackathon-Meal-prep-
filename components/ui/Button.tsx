"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold transition-[transform,background-color,box-shadow,opacity] duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-accent hover:bg-accent-strong",
  secondary: "bg-surface text-ink shadow-card hover:bg-cream-deep",
  soft: "bg-accent-soft text-accent-strong hover:bg-[#ffd6c7]",
  ghost: "bg-transparent text-ink-soft hover:bg-cream-deep",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-5 text-[15px]",
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
        "inline-flex size-11 items-center justify-center rounded-full bg-surface text-ink shadow-soft transition active:scale-95 hover:bg-cream-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
