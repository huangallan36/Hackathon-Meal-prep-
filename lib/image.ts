/**
 * Client-side image helpers. Phone photos are 3-12 MB; Vercel caps request bodies at
 * 4.5 MB, so every photo is downscaled to a JPEG before it leaves the browser.
 */
import type { ImageInput } from "@/lib/types";

/** Downscale a File/Blob to a JPEG data URL (longest side <= maxSide). */
export async function downscaleToDataUrl(file: Blob, maxSide = 1024, quality = 0.82): Promise<string> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC and some Safari cases: fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Smaller copy for localStorage (diary/social thumbnails) */
export async function thumbnailFromDataUrl(dataUrl: string, maxSide = 480, quality = 0.72): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  return downscaleToDataUrl(blob, maxSide, quality);
}

/** data URL or a URL -> the ImageInput the vision/moderation routes accept */
export function toImageInput(src: string): ImageInput {
  const m = /^data:([^;]+);base64,(.+)$/.exec(src);
  if (m) return { base64: m[2], mimeType: m[1] };
  return { url: src };
}
