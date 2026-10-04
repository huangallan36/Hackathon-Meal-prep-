"use client";

import { Camera, ImageUp, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { downscaleToDataUrl } from "@/lib/image";
import { toast } from "@/lib/stores/toast";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export type PhotoSource = "camera" | "upload" | "sample";

/**
 * Camera / upload / sample photo buttons. Calls onPick with either a downscaled JPEG
 * data URL (camera, upload) or the sample's URL as-is (so the server can fetch it).
 * On phones, "Take photo" opens the rear camera; on desktop it opens the file picker.
 */
export function PhotoPicker({
  onPick,
  sampleSrc,
  sampleLabel = "Use sample photo",
  className,
  disabled,
}: {
  onPick: (src: string, source: PhotoSource) => void;
  sampleSrc?: string;
  sampleLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined, source: PhotoSource) {
    if (!file) return;
    setBusy(true);
    try {
      onPick(await downscaleToDataUrl(file), source);
    } catch {
      toast("Couldn't read that photo. Try another one?", "warning");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0], "camera");
          e.target.value = "";
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0], "upload");
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          icon={<Camera className="size-5" />}
          loading={busy}
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          Take photo
        </Button>
        <Button
          size="lg"
          variant="secondary"
          icon={<ImageUp className="size-5" />}
          disabled={disabled || busy}
          onClick={() => uploadRef.current?.click()}
        >
          Upload
        </Button>
      </div>
      {sampleSrc && (
        <Button
          variant="soft"
          icon={<Sparkles className="size-4" />}
          disabled={disabled || busy}
          onClick={() => onPick(sampleSrc, "sample")}
        >
          {sampleLabel}
        </Button>
      )}
    </div>
  );
}
