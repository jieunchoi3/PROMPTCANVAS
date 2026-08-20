"use client";

import { Fragment, useState } from "react";
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

export function AttrTopFilters({ defs }: { defs: readonly AttrDef[] }) {
  const attrFilters = useCanvas((s) => s.attrFilters);
  const toggleAttrFilter = useCanvas((s) => s.toggleAttrFilter);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <>
      {defs.map((attr) => {
        const activeValues = attrFilters[attr.key] ?? [];
        const expanded = expandedKey === attr.key;
        const categoryActive = activeValues.length > 0;

        return (
          <Fragment key={attr.key}>
            <button
              type="button"
              onClick={() => setExpandedKey(expanded ? null : attr.key)}
              className={cn(
                pillBase,
                categoryActive || expanded ? pillCategoryOn : pillOff,
              )}
            >
              {attr.label}
            </button>
            {expanded
              ? attr.options.map((opt) => {
                  const on = activeValues.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAttrFilter(attr.key, opt.value)}
                      className={cn(pillBase, on ? pillOn : pillOff)}
                    >
                      {opt.label}
                    </button>
                  );
                })
              : null}
          </Fragment>
        );
      })}
    </>
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

  return (
    <>
      {tabs.map((tab) => (
        <TagCategoryPills
          key={tab.id}
          tab={tab}
          tags={tags}
          expanded={expandedTabId === tab.id}
          filterTagIds={filterTagIds}
          onExpand={() => setExpandedTabId(expandedTabId === tab.id ? null : tab.id)}
          onToggleTag={toggleFilterTag}
        />
      ))}
    </>
  );
}

function TagCategoryPills({
  tab,
  tags,
  expanded,
  filterTagIds,
  onExpand,
  onToggleTag,
}: {
  tab: TopCategoryTab;
  tags: Tag[];
  expanded: boolean;
  filterTagIds: string[];
  onExpand: () => void;
  onToggleTag: (id: string) => void;
}) {
  const items = tags.filter((tag) => tagMatchesTopTab(tag, tab.id));
  const activeIds = new Set(filterTagIds);
  const categoryActive = items.some((tag) => activeIds.has(tag.id));

  return (
    <>
      <button
        type="button"
        onClick={onExpand}
        className={cn(pillBase, categoryActive || expanded ? pillCategoryOn : pillOff)}
      >
        {tab.label}
      </button>
      {expanded
        ? items.length > 0
          ? items.map((tag) => {
              const on = activeIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleTag(tag.id)}
                  className={cn(pillBase, on ? pillOn : pillOff)}
                >
                  {tag.name}
                </button>
              );
            })
          : (
              <span className="shrink-0 px-1 text-[11px] text-zinc-600">—</span>
            )
        : null}
    </>
  );
}
