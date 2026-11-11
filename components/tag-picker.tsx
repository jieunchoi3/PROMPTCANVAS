"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/locale";
import { S } from "@/lib/strings";
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
  alwaysEditing = false,
}: {
  activeIds: string[];
  onToggle: (tagId: string) => void;
  alwaysEditing?: boolean;
}) {
  const tags = useCanvas((s) => s.tags);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const addTagToSelection = useCanvas((s) => s.addTagToSelection);
  const canEdit = useCanvas((s) => s.canEdit);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const editing = alwaysEditing || adding;

  const tr = useTr();
  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const active = useMemo(() => new Set(activeIds), [activeIds]);
  const activeTags = useMemo(() => tags.filter((tag) => active.has(tag.id)), [tags, active]);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const attachedGroups = useMemo(() => {
    const groups = new Map<string, { label: string; tags: Tag[] }>();
    for (const tag of activeTags) {
      const tab = tabFor(tag, tabs);
      const key = tab?.id ?? "other";
      const group = groups.get(key) ?? { label: tab?.label ?? t("기타", "Other"), tags: [] };
      group.tags.push(tag);
      groups.set(key, group);
    }
    const order = new Map(tabs.map((tab, index) => [tab.id as string, index]));
    return [...groups.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .map(([, group]) => group);
  }, [activeTags, tabs]);

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
    attachedGroups.length > 0 ? (
      <div className="space-y-1.5">
        {attachedGroups.map((group) => (
          <div key={group.label} className="grid grid-cols-[72px_1fr] gap-2 text-[12px] leading-snug">
            <div className="truncate pt-px text-[11px] text-zinc-500">{group.label}</div>
            <div className="min-w-0 text-zinc-100">
              {group.tags.map((tag, index) => (
                <span key={tag.id} className="group/kw">
                  {index > 0 ? <span className="text-zinc-600">, </span> : null}
                  <span className="break-words">{tr(tag.name)}</span>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label={S.tagDelete}
                      onClick={() => onToggle(tag.id)}
                      className="ml-0.5 inline-flex align-middle text-zinc-500 opacity-0 hover:text-zinc-200 group-hover/kw:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    ) : null;

  if (!canEdit) return attached;

  return (
    <div className="space-y-2.5">
      {attached}

      {!editing ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[12px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          <Plus className="size-3.5" />
          {S.addKeyword}
        </button>
      ) : null}

      {editing ? (
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

      ) : null}

      {editing && activeTab ? (
        <>
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus={adding}
              onKeyUp={(e) => {
                // Korean IME swallows the Enter keydown that commits composition; keyup still fires once.
                if (e.key === "Enter") void addDraft();
                if (e.key === "Escape" && !alwaysEditing) {
                  setDraft("");
                  setAdding(false);
                }
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
        </>
      ) : null}
    </div>
  );
}
