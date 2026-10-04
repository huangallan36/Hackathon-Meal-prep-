import { CirclePlay, ExternalLink } from "lucide-react";
import { SectionLabel } from "@/components/ui/Card";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Embedded YouTube tutorial (privacy-enhanced domain). Per YouTube's policies the player
 * is never covered: label sits above it, nothing is layered on top, and it is at least
 * 200px tall (full card width, 16:9 with a 200px floor). Without a known video, link to
 * a YouTube search instead.
 */
export function VideoTutorial({ recipe, className }: { recipe: Pick<Recipe, "title" | "youtubeId">; className?: string }) {
  if (recipe.youtubeId && /^[\w-]{6,20}$/.test(recipe.youtubeId)) {
    const src = `https://www.youtube-nocookie.com/embed/${recipe.youtubeId}?rel=0&modestbranding=1&playsinline=1`;
    return (
      <section className={cn("overflow-hidden rounded-card bg-surface shadow-card", className)}>
        <SectionLabel className="flex items-center gap-2 px-4 pb-3 pt-4">
          <CirclePlay className="size-4 text-accent" />
          Video tutorial
        </SectionLabel>
        <div className="aspect-video min-h-[200px] w-full bg-ink">
          <iframe
            src={src}
            title={`${recipe.title}: video tutorial`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="block size-full border-0"
          />
        </div>
      </section>
    );
  }

  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${recipe.title} recipe`)}`;
  return (
    <a
      href={search}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition active:scale-[0.99] hover:bg-cream-deep",
        className,
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-tile bg-accent-soft text-accent">
        <CirclePlay className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">Watch a tutorial</span>
        <span className="block truncate text-sm text-ink-soft">Search YouTube for &ldquo;{recipe.title}&rdquo;</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-ink-faint" />
    </a>
  );
}
