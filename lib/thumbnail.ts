import {
  IMAGE_MIMES,
  MAX_FILE_BYTES,
  THUMB_LONG_EDGE,
  VIDEO_MIMES,
  VIDEO_POSTER_S,
} from "@/lib/constants";
import { S } from "@/lib/strings";
import type { AssetKind } from "@/lib/types";

const UPLOAD_COMPRESS_MIN_BYTES = 1.5 * 1024 * 1024;
const UPLOAD_LONG_EDGE = 3072;

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

function canvasToWebp(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("thumb encode failed"));
      },
      "image/webp",
      quality,
    );
  });
}

function drawThumb(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxEdge = THUMB_LONG_EDGE,
): HTMLCanvasElement {
  const long = Math.max(sw, sh);
  const scale = long > maxEdge ? maxEdge / long : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context missing");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Big stills (usually PNG screenshots) are re-encoded so the upload stays small; GIFs keep their animation. */
async function compressOriginal(
  file: File,
  img: HTMLImageElement,
): Promise<{ file: File; width: number; height: number } | null> {
  if (file.size < UPLOAD_COMPRESS_MIN_BYTES || file.type === "image/gif") return null;
  const canvas = drawThumb(img, img.naturalWidth, img.naturalHeight, UPLOAD_LONG_EDGE);
  const blob = await canvasToWebp(canvas, 0.92);
  if (blob.size >= file.size) return null;
  const name = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
  return {
    file: new File([blob], name, { type: "image/webp" }),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function makeImageThumb(
  file: File,
  { compress = false }: { compress?: boolean } = {},
): Promise<{
  blob: Blob;
  width: number;
  height: number;
  original: File;
}> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = drawThumb(img, img.naturalWidth, img.naturalHeight);
    const [blob, compressed] = await Promise.all([
      canvasToWebp(canvas),
      compress ? compressOriginal(file, img).catch(() => null) : null,
    ]);
    return {
      blob,
      width: compressed?.width ?? img.naturalWidth,
      height: compressed?.height ?? img.naturalHeight,
      original: compressed?.file ?? file,
    };
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
