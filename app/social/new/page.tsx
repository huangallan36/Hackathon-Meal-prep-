"use client";

import { Send, ShieldCheck } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BlockedNotice } from "@/components/social/composer/BlockedNotice";
import { ComposerFields } from "@/components/social/composer/ComposerFields";
import { PhotoPanel, type PhotoOrigin } from "@/components/social/composer/PhotoPanel";
import { Button } from "@/components/ui/Button";
import type { PhotoSource } from "@/components/ui/PhotoPicker";
import { PageTitle, ScreenHeader } from "@/components/ui/ScreenHeader";
import { DEMO_USER } from "@/lib/config";
import { thumbnailFromDataUrl } from "@/lib/image";
import { moderatePost } from "@/lib/social/client";
import { sharePhotoSample } from "@/lib/social/feed";
import { CAPTION_MAX, DISH_NAME_MAX } from "@/lib/social/moderation-policy";
import { useSocial } from "@/lib/stores/social";
import { toast } from "@/lib/stores/toast";
import { speak } from "@/lib/voice/engine";

type Status = "idle" | "checking" | "posting";

/**
 * Post composer: photo -> dish name + caption -> Gemini moderation -> feed.
 * A draft handed off from the AI tab ("Share to Social") prefills photo + dish.
 */
export default function NewPostPage() {
  const router = useRouter();
  const addPost = useSocial((s) => s.addPost);
  const setDraft = useSocial((s) => s.setDraft);

  // Read the hand-off once; the composer owns the values from here on.
  const [draft] = useState(() => useSocial.getState().draft);
  const sample = useMemo(() => sharePhotoSample(), []);

  const [photo, setPhoto] = useState<string | null>(draft?.image ?? null);
  const [origin, setOrigin] = useState<PhotoOrigin | null>(draft?.image ? "draft" : null);
  const [dishName, setDishName] = useState((draft?.dishName ?? "").slice(0, DISH_NAME_MAX));
  const [caption, setCaption] = useState("");
  const [recipeId, setRecipeId] = useState<number | undefined>(draft?.recipeId);
  const [status, setStatus] = useState<Status>("idle");
  /** The block applies to the exact content that was checked; any edit clears it. */
  const [blocked, setBlocked] = useState<{ reason: string; key: string } | null>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  /** False once the user leaves mid-check, so a late verdict doesn't post or navigate. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const busy = status !== "idle";
  const contentKey = `${photo ?? ""}|${dishName.trim()}|${caption.trim()}`;
  const blockedReason = blocked && blocked.key === contentKey ? blocked.reason : null;
  const canPost = Boolean(photo && dishName.trim()) && !busy && !blockedReason;
  /** Why Post is disabled, shown under the button instead of the usual note */
  const missing = !photo ? "Add a photo of your dish to post" : !dishName.trim() ? "Give your dish a name to post" : null;

  function handlePick(src: string, source: PhotoSource) {
    setPhoto(src);
    setOrigin(source);
    if (source === "sample" && sample) {
      setRecipeId(sample.recipeId);
      if (!dishName.trim()) setDishName(sample.title.slice(0, DISH_NAME_MAX));
    } else {
      setRecipeId(draft?.recipeId);
    }
  }

  function removePhoto() {
    setPhoto(null);
    setOrigin(null);
  }

  async function submit() {
    if (!photo || !dishName.trim() || busy) return;
    const name = dishName.trim().slice(0, DISH_NAME_MAX);
    const text = caption.trim().slice(0, CAPTION_MAX);
    const checkedKey = contentKey;

    setStatus("checking");
    setBlocked(null);
    try {
      // moderatePost never throws: it falls back to the local caption check.
      const verdict = await moderatePost({ photo, caption: text, dishName: name });
      if (!alive.current) return;
      if (!verdict.allowed) {
        setBlocked({ reason: verdict.reason, key: checkedKey });
        setStatus("idle");
        return;
      }

      setStatus("posting");
      let image = photo;
      if (photo.startsWith("data:")) {
        try {
          // Bigger than the diary thumbnail: this photo fills the whole swipe card.
          image = await thumbnailFromDataUrl(photo, 720, 0.78);
        } catch {
          // Keep the original if the canvas is unavailable; it is already downscaled.
        }
      }
      if (!alive.current) return;
      addPost({ author: DEMO_USER.handle, dishName: name, caption: text, image, recipeId });
      setDraft(null);
      toast("Posted!", "success");
      sayIfTalking("Posted! Your dish is live on Social.");
      // replace: Back from the feed should not land on an emptied composer
      router.replace("/social");
    } catch {
      if (!alive.current) return;
      setStatus("idle");
      toast("Couldn't post that just now. Try again?", "warning");
    }
  }

  return (
    <div className="pb-nav">
      {/* Figma 2.4 pattern: header bar with the back circle, then the large page title */}
      <ScreenHeader back="/social" />
      <PageTitle title="New post" subtitle="Share what you cooked with the community" className="pt-1" />

      <div className="flex flex-col gap-5 px-5 pt-4">
        <PhotoPanel
          photo={photo}
          origin={origin}
          scanning={status === "checking"}
          sampleSrc={sample?.src}
          disabled={busy}
          onPick={handlePick}
          onRemove={removePhoto}
        />

        <ComposerFields
          dishName={dishName}
          caption={caption}
          disabled={busy}
          captionRef={captionRef}
          onDishName={setDishName}
          onCaption={setCaption}
        />

        <AnimatePresence initial={false}>
          {blockedReason && (
            <BlockedNotice
              key="blocked"
              reason={blockedReason}
              onChangePhoto={removePhoto}
              onEditCaption={() => captionRef.current?.focus()}
            />
          )}
        </AnimatePresence>

        <div>
          <Button
            size="lg"
            full
            loading={busy}
            disabled={!canPost}
            icon={<Send className="size-[18px]" strokeWidth={1.9} />}
            onClick={() => void submit()}
          >
            {status === "checking" ? "Checking your post..." : status === "posting" ? "Posting..." : "Post"}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
            <ShieldCheck className="size-3.5 shrink-0 text-accent" strokeWidth={1.9} />
            {missing ?? "Sous checks every post to keep the feed tasty and kind"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Sous confirms out loud only during a voice session; voice is never required to post. */
function sayIfTalking(text: string) {
  try {
    speak(text, { onlyIfSession: true }).catch(() => {});
  } catch {
    /* voice engine unavailable */
  }
}
