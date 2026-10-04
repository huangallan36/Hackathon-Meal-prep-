import { longDayLabel } from "@/lib/diary/stats";
import type { ISODate } from "@/lib/types";
import { formatDay } from "@/lib/utils";

type Bucket = [maxLength: number, long: string, short: string];

/**
 * Container widths (px) at which the long label fits, bucketed by label length. Measured
 * in Fraunces semibold: at 22px, 13 chars <= 159px ... 17 chars <= 208px; 26px scales by 26/22.
 * Full class strings so Tailwind can see them.
 */
const BUCKETS: Record<"header" | "hero", Bucket[]> = {
  // ScreenHeader title (22px)
  header: [
    [13, "hidden @min-[162px]:inline", "@min-[162px]:hidden"],
    [14, "hidden @min-[175px]:inline", "@min-[175px]:hidden"],
    [15, "hidden @min-[179px]:inline", "@min-[179px]:hidden"],
    [16, "hidden @min-[198px]:inline", "@min-[198px]:hidden"],
    [Infinity, "hidden @min-[211px]:inline", "@min-[211px]:hidden"],
  ],
  // Diary home day heading (26px)
  hero: [
    [13, "hidden @min-[191px]:inline", "@min-[191px]:hidden"],
    [14, "hidden @min-[207px]:inline", "@min-[207px]:hidden"],
    [15, "hidden @min-[211px]:inline", "@min-[211px]:hidden"],
    [16, "hidden @min-[234px]:inline", "@min-[234px]:hidden"],
    [Infinity, "hidden @min-[249px]:inline", "@min-[249px]:hidden"],
  ],
};

/**
 * "Thursday, Oct 2" when there is room, "Thu, Oct 2" when there isn't (narrow phones, long
 * weekdays), so a truncated "Wednesday, Sep 3…" never shows the wrong date. A container
 * query, because the phone frame is narrower than the viewport.
 */
export function DayTitle({ date, size = "header" }: { date: ISODate; size?: "header" | "hero" }) {
  const long = longDayLabel(date);
  const buckets = BUCKETS[size];
  const [, longClass, shortClass] = buckets.find(([max]) => long.length <= max) ?? buckets[buckets.length - 1];
  return (
    <span className="block @container">
      <span className="sr-only">{long}</span>
      <span className={longClass} aria-hidden>
        {long}
      </span>
      <span className={shortClass} aria-hidden>
        {formatDay(date, { weekday: "short", month: "short", day: "numeric" })}
      </span>
    </span>
  );
}
