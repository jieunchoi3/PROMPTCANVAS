import {
  IMAGE_MIMES,
  MAX_FILE_BYTES,
  THUMB_LONG_EDGE,
  VIDEO_MIMES,
  VIDEO_POSTER_S,
} from "@/lib/constants";
import { S } from "@/lib/strings";
import type { AssetKind } from "@/lib/types";

export function kindFromMime(mime: string): AssetKind | null {
  const lower = mime.toLowerCase();
  if (IMAGE_MIMES.includes(lower as (typeof IMAGE_MIMES)[number])) return "image";
  if (VIDEO_MIMES.includes(lower as (typeof VIDEO_MIMES)[number])) return "video";
  return null;
}

export function kindFromName(name: string): AssetKind | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return null;
}

export function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: S.uploadRejectSize };
  const kind = kindFromMime(file.type) ?? kindFromName(file.name);
  if (!kind) return { ok: false, error: S.uploadRejectType };
  return { ok: true };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("thumb encode failed"));
      },
      "image/webp",
      0.82,
    );
  });
}

function drawThumb(
  source: CanvasImageSource,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const long = Math.max(sw, sh);
  const scale = long > THUMB_LONG_EDGE ? THUMB_LONG_EDGE / long : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context missing");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function makeImageThumb(file: Blob): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = drawThumb(img, img.naturalWidth, img.naturalHeight);
    const blob = await canvasToWebp(canvas);
    return { blob, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function makeVideoThumb(file: Blob): Promise<{
  blob: Blob;
  width: number;
  height: number;
  duration_ms: number;
}> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video load failed"));
    });
    const duration_ms = Number.isFinite(video.duration)
      ? Math.round(video.duration * 1000)
      : 0;
    const t = Math.min(VIDEO_POSTER_S, Math.max(0, (video.duration || 1) * 0.05));
    video.currentTime = t;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    const canvas = drawThumb(video, video.videoWidth, video.videoHeight);
    const blob = await canvasToWebp(canvas);
    return {
      blob,
      width: video.videoWidth,
      height: video.videoHeight,
      duration_ms,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
