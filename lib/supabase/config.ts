/** Isolated from shared Supabase projects that already use public.assets / media. */
export const PROMPT_CANVAS_SCHEMA = "prompt_canvas" as const;
export const PROMPT_CANVAS_MEDIA_BUCKET = "prompt-canvas-media" as const;
/** Single open workspace — all visitors share this library (no login). */
export const PROMPT_CANVAS_SHARED_USER_ID =
  "00000000-0000-4000-8000-000000000001";
