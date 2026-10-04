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
import { ScreenHeader } from "@/components/ui/ScreenHeader";
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
        image = await thumbnailFromDataUrl(photo);
      } catch {
        // Keep the original if the canvas is unavailable; it is already downscaled.
      }
    }
    if (!alive.current) return;
    addPost({ author: DEMO_USER.handle, dishName: name, caption: text, image, recipeId });
    setDraft(null);
    toast("Posted!", "success");
    sayIfTalking("Posted! Your dish is live on Social.");
    router.push("/social");
  }

  return (
    <div className="pb-nav">
      <ScreenHeader back="/social" title="New post" subtitle="Share what you cooked" />

      <div className="flex flex-col gap-5 px-5 pt-1">
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
            icon={<Send className="size-5" />}
            onClick={() => void submit()}
          >
            {status === "checking" ? "Checking your post..." : status === "posting" ? "Posting..." : "Post"}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-faint">
            <ShieldCheck className="size-3.5 shrink-0" />
            Sous checks every post to keep the feed tasty and kind
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
