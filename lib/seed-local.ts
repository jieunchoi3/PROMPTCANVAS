import type { LibraryRepo } from "@/lib/data/repo";
import { SEED_ASSETS } from "@/lib/seed-data";
import { STARTER_TAGS } from "@/lib/tag-kinds";

const SEED_TITLES = new Set(SEED_ASSETS.map((s) => s.title));

/** Remove auto-generated demo assets from a previous version. */
export async function clearSeedAssets(repo: LibraryRepo): Promise<number> {
  const assets = await repo.listAssets("all");
  const ids = assets.filter((a) => a.title && SEED_TITLES.has(a.title)).map((a) => a.id);
  if (ids.length === 0) return 0;
  await repo.softDelete(ids);
  return ids.length;
}

export async function ensureStarterTags(repo: LibraryRepo): Promise<void> {
  const existing = await repo.listTags();
  const names = new Set(existing.map((t) => t.name));
  for (const starter of STARTER_TAGS) {
    if (!names.has(starter.name)) {
      await repo.upsertTag(starter.name, starter.kind);
    }
  }
}
