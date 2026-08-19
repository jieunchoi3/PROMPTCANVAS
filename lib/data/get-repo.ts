import { isCloudEnabled } from "@/lib/env";
import { createLocalRepo } from "@/lib/data/local-repo";
import { createSupabaseRepo } from "@/lib/data/supabase-repo";
import type { LibraryRepo } from "@/lib/data/repo";

let singleton: LibraryRepo | null = null;

export function getRepo(): LibraryRepo {
  if (!singleton) {
    singleton = isCloudEnabled() ? createSupabaseRepo() : createLocalRepo();
  }
  return singleton;
}
