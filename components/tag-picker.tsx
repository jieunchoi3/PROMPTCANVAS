"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { groupTags, filterTagsByDraft } from "@/lib/tag-kinds";
import { useTr } from "@/hooks/use-tr";
import { cn } from "@/lib/utils";
import {
  customCategoryId,
  mergeTopTabs,
  tagMatchesTopTab,
  type TopCategoryTab,
} from "@/lib/top-categories";
import type { Tag } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

function tabFor(tag: Tag, tabs: TopCategoryTab[]): TopCategoryTab | undefined {
  return tabs.find((tab) => tagMatchesTopTab(tag, tab.id));
}

export function TagPicker({
  activeIds,
  onToggle,
}: {
  activeIds: string[];
  onToggle: (tagId: string) => void;
}) {
  const tags = useCanvas((s) => s.tags);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const addTagToSelection = useCanvas((s) => s.addTagToSelection);
  const canEdit = useCanvas((s) => s.canEdit);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const tr = useTr();
  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const grouped = useMemo(() => groupTags(tags), [tags]);
  const active = useMemo(() => new Set(activeIds), [activeIds]);
  const activeTags = useMemo(() => tags.filter((tag) => active.has(tag.id)), [tags, active]);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const allTabItems = activeTab
    ? activeTab.builtin
      ? grouped.find((g) => g.kind === activeTab.id)?.items ?? []
      : tags.filter((tag) => tagMatchesTopTab(tag, activeTab.id))
    : [];
  const tabItems = filterTagsByDraft(allTabItems, draft, tr);

  async function addDraft() {
    if (!activeTab) return;
    const names = draft
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setDraft("");
    const kind = activeTab.builtin ? activeTab.id : "free";
    const categoryKey = activeTab.builtin ? null : activeTab.id;
    for (const name of names) {
      await addTagToSelection(name, kind, categoryKey);
    }
  }

  async function addCategory() {
    const label = window.prompt(S.addCustomTabPh)?.trim();
    if (!label) return;
    await useCanvas.getState().addCustomTopCategory(label);
    setActiveTabId(customCategoryId(label));
  }

  if (!canEdit && activeTags.length === 0) {
    return <p className="text-[12px] text-zinc-600">—</p>;
  }

  const attached =
    activeTags.length > 0 ? (
      <div className="flex flex-wrap gap-1.5">
        {activeTags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              "inline-flex max-w-full items-center gap-1 rounded-full bg-[#D9B382]/15 py-0.5 pl-2 text-[12px] leading-snug text-[#D9B382]",
              canEdit ? "pr-1" : "pr-2",
            )}
          >
            <span className="shrink-0 text-[10px] text-[#D9B382]/60">
              {tabFor(tag, tabs)?.label}
            </span>
            <span className="min-w-0 break-words">{tr(tag.name)}</span>
            {canEdit ? (
              <button
                type="button"
                aria-label={S.tagDelete}
                onClick={() => onToggle(tag.id)}
                className="shrink-0 rounded-full p-0.5 hover:bg-[#D9B382]/20"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </span>
        ))}
      </div>
    ) : null;

  if (!canEdit) return attached;

  return (
    <div className="space-y-2.5">
      {attached}

      <div className="flex flex-wrap gap-1">
        {tabs.map((tab) => {
          const count = activeTags.filter((tag) => tagMatchesTopTab(tag, tab.id)).length;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px]",
                activeTab?.id === tab.id
                  ? "bg-white text-[#0B0B0D]"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
            >
              {tab.label}
              {count > 0 ? (
                <span className="size-1.5 rounded-full bg-[#D9B382]" aria-hidden />
              ) : null}
            </button>
          );
        })}
        <button
          type="button"
          aria-label={S.addCustomTab}
          title={S.addCustomTab}
          onClick={() => void addCategory()}
          className="inline-flex size-6 items-center justify-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {activeTab ? (
        <>
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyUp={(e) => {
                // Korean IME swallows the Enter keydown that commits composition; keyup still fires once.
                if (e.key === "Enter") void addDraft();
              }}
              placeholder={S.termKeywordPh(activeTab.label)}
              className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] outline-none focus:border-[#D9B382]/60"
            />
            <Button
              size="sm"
              className="h-8 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
              disabled={!draft.trim()}
              onClick={() => void addDraft()}
            >
              {S.tagCreate}
            </Button>
          </div>
          {tabItems.length > 0 ? (
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {tabItems.map((tag) => {
                const on = active.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggle(tag.id)}
                    className={cn(
                      "h-6 rounded-full px-2 text-[12px]",
                      on
                        ? "bg-[#D9B382] text-[#0B0B0D]"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10",
                    )}
                  >
                    {tr(tag.name)}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
