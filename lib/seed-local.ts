import type { LibraryRepo } from "@/lib/data/repo";
import { STARTER_TAGS } from "@/lib/tag-kinds";

export async function ensureStarterTags(repo: LibraryRepo): Promise<void> {
  const existing = await repo.listTags();
  const names = new Set(existing.map((t) => t.name));
  for (const starter of STARTER_TAGS) {
    if (!names.has(starter.name)) {
      await repo.upsertTag(starter.name, starter.kind);
    }
  }
}
