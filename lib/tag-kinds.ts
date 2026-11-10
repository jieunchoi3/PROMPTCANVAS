import type { Tag, TagKind } from "@/lib/types";
import { t } from "@/lib/locale";

export const TAG_KINDS: { key: TagKind; label: string }[] = [
  { key: "lighting", label: t("조명", "Lighting") },
  { key: "colour", label: t("색감", "Colour") },
  { key: "camera", label: t("카메라 앵글/구도", "Camera angle/composition") },
  { key: "pose", label: t("포즈", "Pose") },
  { key: "style", label: t("무드", "Mood") },
  { key: "subject", label: t("피사체", "Subject") },
  { key: "effect", label: t("효과", "Effects") },
  { key: "free", label: t("기타", "Other") },
];

export const TOP_CATEGORY_KINDS: TagKind[] = [
  "lighting",
  "camera",
  "colour",
  "style",
  "pose",
];

export const STARTER_TAGS: { name: string; kind: TagKind }[] = [];

export function kindLabel(kind: TagKind): string {
  return TAG_KINDS.find((k) => k.key === kind)?.label ?? kind;
}

export function groupTags(tags: Tag[]): { kind: TagKind; items: Tag[] }[] {
  const map = new Map<TagKind, Map<string, Tag>>();
  for (const tag of tags) {
    const byName = map.get(tag.kind) ?? new Map<string, Tag>();
    const key = tag.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || existing.use_count < tag.use_count) {
      byName.set(key, tag);
    }
    map.set(tag.kind, byName);
  }
  return TAG_KINDS.map((k) => ({
    kind: k.key,
    items: [...(map.get(k.key)?.values() ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "ko"),
    ),
  })).filter((g) => g.items.length > 0);
}

function normalizeKeyword(text: string): string {
  return text.toLowerCase().replace(/[\s\-_/.,]+/g, "");
}

/** While typing a new keyword, only existing keywords matching the last comma-separated part stay visible. */
export function filterTagsByDraft<T extends { name: string }>(
  items: T[],
  draft: string,
  display: (name: string) => string = (name) => name,
): T[] {
  const query = normalizeKeyword(draft.split(",").pop() ?? "");
  if (!query) return items;
  return items.filter(
    (item) =>
      normalizeKeyword(item.name).includes(query) ||
      normalizeKeyword(display(item.name)).includes(query),
  );
}
