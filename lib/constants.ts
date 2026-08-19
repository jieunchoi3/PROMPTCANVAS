export const CANVAS_BG = "#0B0B0D";
export const ACCENT = "#D9B382";
export const GRID = 8;
export const SNAP_THRESHOLD = 5;
export const CULL_PAD = 500;
export const ASSET_GAP = 16;
export const DEFAULT_ASSET_W = 240;
export const MIN_ASSET_W = 48;
export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const THUMB_LONG_EDGE = 640;
export const PERSIST_MS = 500;
export const UNDO_TOAST_MS = 10_000;
export const UPLOAD_CONCURRENCY = 3;
export const MAX_FILTER_CHIPS = 8;
export const VIDEO_POSTER_S = 0.5;

export const IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp,.gif,.avif,.mp4,.webm,.mov";

export const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
