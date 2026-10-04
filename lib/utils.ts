import { clsx, type ClassValue } from "clsx";
import type { ISODate, MealType } from "@/lib/types";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Short random id (not crypto-grade; fine for local demo data) */
export function uid(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* Dates (local time, "YYYY-MM-DD")                                    */
/* ------------------------------------------------------------------ */

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday-start week containing `iso` */
export function weekRange(iso: ISODate): { start: ISODate; end: ISODate; days: ISODate[] } {
  const d = fromISODate(iso);
  const offset = (d.getDay() + 6) % 7;
  const start = addDays(iso, -offset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6], days };
}

export function formatDay(iso: ISODate, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return fromISODate(iso).toLocaleDateString("en-US", opts);
}

/** Meal slot that fits the current time of day */
export function mealForNow(date = new Date()): MealType {
  const h = date.getHours();
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

export function timeAgo(epochMs: number): string {
  const s = Math.max(1, Math.round((Date.now() - epochMs) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function formatCount(n: number): string {
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
