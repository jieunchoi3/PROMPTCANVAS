import type { Tag, TagKind } from "@/lib/types";

export const TAG_KINDS: { key: TagKind; label: string }[] = [
  { key: "lighting", label: "조명" },
  { key: "colour", label: "색감" },
  { key: "camera", label: "카메라 앵글" },
  { key: "pose", label: "포즈" },
  { key: "style", label: "전체 분위기" },
  { key: "subject", label: "피사체" },
  { key: "effect", label: "효과" },
  { key: "free", label: "기타" },
];

export const TOP_CATEGORY_KINDS: TagKind[] = [
  "lighting",
  "colour",
  "camera",
  "pose",
  "style",
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
