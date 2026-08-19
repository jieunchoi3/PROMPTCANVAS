import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { PROMPT_CANVAS_SCHEMA } from "@/lib/supabase/config";

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey(), {
    db: { schema: PROMPT_CANVAS_SCHEMA },
  });
}
