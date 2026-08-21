"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mergeTopTabs, tagMatchesTopTab, type TopCategoryTab } from "@/lib/top-categories";
import type { Tag } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

type AttrDef = {
  key: string;
  label: string;
  multi: boolean;
  options: readonly { value: string; label: string }[];
};

const pillBase = "h-6 shrink-0 rounded-full px-2 text-[12px] transition-colors";
const pillOn = "bg-[#D9B382] text-[#0B0B0D]";
const pillOff = "bg-white/5 text-zinc-400 hover:bg-white/10";
const pillCategoryOn = "bg-white/15 text-zinc-100 ring-1 ring-[#D9B382]/40";
const scrollRow =
  "flex w-full min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function AttrTopFilters({ defs }: { defs: readonly AttrDef[] }) {
  const attrFilters = useCanvas((s) => s.attrFilters);
  const toggleAttrFilter = useCanvas((s) => s.toggleAttrFilter);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Keep the matching category open when a subcategory filter is active.
  useEffect(() => {
    if (expandedKey) return;
    const active = defs.find((attr) => (attrFilters[attr.key] ?? []).length > 0);
    if (active) setExpandedKey(active.key);
  }, [attrFilters, defs, expandedKey]);

  const expanded = defs.find((attr) => attr.key === expandedKey) ?? null;
  const activeValues = expanded ? (attrFilters[expanded.key] ?? []) : [];

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className={scrollRow}>
        {defs.map((attr) => {
          const values = attrFilters[attr.key] ?? [];
          const on = values.length > 0 || expandedKey === attr.key;
          return (
            <button
              key={attr.key}
              type="button"
              onClick={() => setExpandedKey(expandedKey === attr.key ? null : attr.key)}
              className={cn(pillBase, on ? pillCategoryOn : pillOff)}
            >
              {attr.label}
            </button>
          );
        })}
      </div>
      {expanded ? (
        <div className={scrollRow}>
          {expanded.options.map((opt) => {
            const on = activeValues.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleAttrFilter(expanded.key, opt.value)}
                className={cn(pillBase, on ? pillOn : pillOff)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TagTopFilters({
  customTopCategories,
}: {
  customTopCategories: { id: string; label: string }[];
}) {
  const tags = useCanvas((s) => s.tags);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const toggleFilterTag = useCanvas((s) => s.toggleFilterTag);
  const [expandedTabId, setExpandedTabId] = useState<string | null>(null);
  const tabs = mergeTopTabs(customTopCategories);
  const expanded = tabs.find((tab) => tab.id === expandedTabId) ?? null;
  const items = expanded
    ? tags.filter((tag) => tagMatchesTopTab(tag, expanded.id))
    : [];
  const activeIds = new Set(filterTagIds);

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className={scrollRow}>
        {tabs.map((tab) => (
          <TagCategoryButton
            key={tab.id}
            tab={tab}
            tags={tags}
            expanded={expandedTabId === tab.id}
            filterTagIds={filterTagIds}
            onExpand={() => setExpandedTabId(expandedTabId === tab.id ? null : tab.id)}
          />
        ))}
      </div>
      {expanded ? (
        <div className={scrollRow}>
          {items.length > 0 ? (
            items.map((tag) => {
              const on = activeIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleFilterTag(tag.id)}
                  className={cn(pillBase, on ? pillOn : pillOff)}
                >
                  {tag.name}
                </button>
              );
            })
          ) : (
            <span className="shrink-0 px-1 text-[11px] text-zinc-600">—</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TagCategoryButton({
  tab,
  tags,
  expanded,
  filterTagIds,
  onExpand,
}: {
  tab: TopCategoryTab;
  tags: Tag[];
  expanded: boolean;
  filterTagIds: string[];
  onExpand: () => void;
}) {
  const items = tags.filter((tag) => tagMatchesTopTab(tag, tab.id));
  const activeIds = new Set(filterTagIds);
  const categoryActive = items.some((tag) => activeIds.has(tag.id));

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(pillBase, categoryActive || expanded ? pillCategoryOn : pillOff)}
    >
      {tab.label}
    </button>
  );
}
