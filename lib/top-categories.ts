import type { TagKind } from "@/lib/types";
import { TOP_CATEGORY_KINDS, kindLabel } from "@/lib/tag-kinds";

export type CustomTopCategory = { id: string; label: string };

export type TopCategoryTab =
  | { id: TagKind; label: string; builtin: true }
  | { id: string; label: string; builtin: false };

const STORAGE_KEY = "pc.customTopCategories";

export function customCategoryId(label: string): string {
  const trimmed = label.trim();
  return `custom:${encodeURIComponent(trimmed)}`;
}

export function customCategoryLabel(id: string): string {
  if (!id.startsWith("custom:")) return id;
  try {
    return decodeURIComponent(id.slice("custom:".length));
  } catch {
    return id.slice("custom:".length);
  }
}

export function readCustomTopCategories(): CustomTopCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomTopCategory[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCustomTopCategories(categories: CustomTopCategory[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function builtinTopTabs(): TopCategoryTab[] {
  return TOP_CATEGORY_KINDS.map((kind) => ({
    id: kind,
    label: kindLabel(kind),
    builtin: true as const,
  }));
}

export function mergeTopTabs(custom: CustomTopCategory[]): TopCategoryTab[] {
  return [
    ...builtinTopTabs(),
    ...custom.map((cat) => ({ id: cat.id, label: cat.label, builtin: false as const })),
  ];
}

export function isBuiltinTabId(id: string): id is TagKind {
  return TOP_CATEGORY_KINDS.includes(id as TagKind);
}

export function tagMatchesTopTab(
  tag: { kind: TagKind; category_key?: string | null },
  tabId: string,
): boolean {
  if (isBuiltinTabId(tabId)) {
    return tag.kind === tabId && !tag.category_key;
  }
  return tag.category_key === tabId;
}
