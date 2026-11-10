"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { mergeTopTabs, tagMatchesTopTab } from "@/lib/top-categories";
import type { TagKind } from "@/lib/types";
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
  const addTagToSelection = useCanvas((s) => s.addTagToSelection);
  const canEdit = useCanvas((s) => s.canEdit);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const tabs = useMemo(() => mergeTopTabs(customTopCategories), [customTopCategories]);
  const activeTags = useMemo(() => {
    const active = new Set(activeIds);
    return tags.filter((tag) => active.has(tag.id));
  }, [tags, activeIds]);

  async function addDraft(tabId: string, kind: TagKind, categoryKey: string | null) {
    const names = (drafts[tabId] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setDrafts((current) => ({ ...current, [tabId]: "" }));
    for (const name of names) {
      await addTagToSelection(name, kind, categoryKey);
    }
  }

  if (!canEdit && activeTags.length === 0) {
    return <p className="text-[12px] text-zinc-600">—</p>;
  }

  return (
    <div className="space-y-3">
      {tabs.map((tab) => {
        const items = activeTags.filter((tag) => tagMatchesTopTab(tag, tab.id));
        if (!canEdit && items.length === 0) return null;
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
                {items.map((tag) => (
                  <span
                    key={tag.id}
                    className={cn(
                      "inline-flex max-w-full items-start gap-1 rounded-xl bg-[#D9B382] py-1 pl-2 text-[12px] leading-snug text-[#0B0B0D]",
                      canEdit ? "pr-1" : "pr-2",
                    )}
                  >
                    <span className="min-w-0 break-words">{tag.name}</span>
                    {canEdit ? (
                      <button
                        type="button"
                        aria-label={S.tagDelete}
                        onClick={() => onToggle(tag.id)}
                        className="shrink-0 rounded-full p-0.5 hover:bg-black/10"
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
            {canEdit ? (
            <div className="flex gap-1.5">
              <input
                value={draft}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [tab.id]: e.target.value,
                  }))
                }
                onKeyUp={(e) => {
                  // Korean IME swallows the Enter keydown that commits composition; keyup still fires once.
                  if (e.key === "Enter") void addDraft(tab.id, kind, categoryKey);
                }}
                placeholder={S.tagKeywordPh(tab.label)}
                className="h-7 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[12px] outline-none focus:border-[#D9B382]/60"
              />
              <Button
                size="xs"
                className="h-7 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
                disabled={!draft.trim()}
                onClick={() => void addDraft(tab.id, kind, categoryKey)}
              >
                {S.tagCreate}
              </Button>
            </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
