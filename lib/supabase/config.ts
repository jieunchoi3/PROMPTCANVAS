/** Isolated from shared Supabase projects that already use public.assets / media. */
export const PROMPT_CANVAS_SCHEMA = "prompt_canvas" as const;
export const PROMPT_CANVAS_MEDIA_BUCKET = "prompt-canvas-media" as const;
/** The only account allowed to edit; everyone else sees this library read-only. Must match prompt_canvas.library_owner(). */
export const PROMPT_CANVAS_OWNER_ID = "c7b2de4d-709b-43e7-8790-1269c94a4ccb";
