"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { groupTags } from "@/lib/tag-kinds";
import { mergeTopTabs, tagMatchesTopTab } from "@/lib/top-categories";
import type { TagKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/store/canvas-store";

export function TagPicker({
  activeIds,
  onToggle,
}: {
  activeIds: string[];
  onToggle: (tagId: string) => void;
}) {
  const tags = useCanvas((s) => s.tags);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const createTag = useCanvas((s) => s.createTag);
  const addTagToSelection = useCanvas((s) => s.addTagToSelection);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const tabs = useMemo(() => mergeTopTabs(customTopCategories), [customTopCategories]);
  const grouped = useMemo(() => groupTags(tags), [tags]);
  const active = new Set(activeIds);

  async function createAndAttach(tabId: string, kind: TagKind, categoryKey: string | null) {
    const name = drafts[tabId]?.trim() ?? "";
    if (!name) return;
    const tag = await createTag(name, kind, categoryKey);
    if (!tag) {
      toast.error(S.tagExists);
      return;
    }
    setDrafts((current) => ({ ...current, [tabId]: "" }));
    if (selectedIds.length > 0) await addTagToSelection(tag.name, kind, categoryKey);
  }

  return (
    <div className="space-y-3">
      {tabs.map((tab) => {
        const items = tab.builtin
          ? grouped.find((group) => group.kind === tab.id)?.items ?? []
          : tags.filter((tag) => tagMatchesTopTab(tag, tab.id));
        const draft = drafts[tab.id] ?? "";
        const kind = tab.builtin ? tab.id : "free";
        const categoryKey = tab.builtin ? null : tab.id;
        return (
          <div key={tab.id} className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">
              {tab.label}
            </div>
            {items.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {items.map((tag) => {
                  const on = active.has(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggle(tag.id)}
                      className={cn(
                        "h-6 rounded-full px-2 text-[12px] transition-colors",
                        on
                          ? "bg-[#D9B382] text-[#0B0B0D]"
                          : "bg-white/5 text-zinc-400 hover:bg-white/10",
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [tab.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draft.trim()) {
                    e.preventDefault();
                    void createAndAttach(tab.id, kind, categoryKey);
                  }
                }}
                placeholder={`${tab.label} 키워드`}
                className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] outline-none focus:border-[#D9B382]/60"
              />
              <Button
                size="xs"
                className="h-7 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
                disabled={!draft.trim()}
                onClick={() => void createAndAttach(tab.id, kind, categoryKey)}
              >
                {S.tagCreate}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
