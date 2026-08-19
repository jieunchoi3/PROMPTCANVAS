import { CHARACTER_ATTRIBUTES } from "@/config/character-attributes";
import { WARDROBE_ATTRIBUTES } from "@/config/wardrobe-attributes";
import type { AttributeMap } from "@/lib/types";

type AttrDef = {
  key: string;
  multi: boolean;
  options: readonly { value: string; label: string }[];
};

function allDefs(): readonly AttrDef[] {
  return [...CHARACTER_ATTRIBUTES, ...WARDROBE_ATTRIBUTES];
}

export function attrValues(map: AttributeMap | undefined, key: string): string[] {
  const raw = map?.[key];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function toggleAttribute(
  map: AttributeMap,
  key: string,
  value: string,
): AttributeMap {
  const def = allDefs().find((a) => a.key === key);
  const current = attrValues(map, key);
  const on = current.includes(value);
  let next: string[];
  if (!def?.multi) {
    next = on ? [] : [value];
  } else {
    next = on ? current.filter((v) => v !== value) : [...current, value];
  }
  const copy: AttributeMap = { ...map };
  if (next.length === 0) delete copy[key];
  else copy[key] = def?.multi ? next : next[0];
  return copy;
}

export function matchesAttributes(
  map: AttributeMap | undefined,
  filters: Record<string, string[]>,
): boolean {
  for (const [key, selected] of Object.entries(filters)) {
    if (selected.length === 0) continue;
    const vals = attrValues(map, key);
    if (!selected.some((s) => vals.includes(s))) return false;
  }
  return true;
}

export function hasAttrFilters(filters: Record<string, string[]>): boolean {
  return Object.values(filters).some((v) => v.length > 0);
}

export function optionLabel(key: string, value: string): string {
  const def = allDefs().find((a) => a.key === key);
  return def?.options.find((o) => o.value === value)?.label ?? value;
}
