"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const setTagCategory = useCanvas((s) => s.setTagCategory);
  const canEdit = useCanvas((s) => s.canEdit);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [categoryOpenFor, setCategoryOpenFor] = useState<string | null>(null);
  const editing = alwaysEditing || adding;

  const tr = useTr();
  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const active = useMemo(() => new Set(activeIds), [activeIds]);
  const activeTags = useMemo(() => tags.filter((tag) => active.has(tag.id)), [tags, active]);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const attachedRows = useMemo(() => {
    const order = new Map(tabs.map((tab, index) => [tab.id as string, index]));
    return [...activeTags]
      .map((tag) => {
        const tab = tabFor(tag, tabs);
        return {
          tag,
          tabId: tab?.id ?? "other",
          label: tab?.label ?? t("기타", "Other"),
        };
      })
      .sort((a, b) => (order.get(a.tabId) ?? 999) - (order.get(b.tabId) ?? 999));
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
    await Promise.all(names.map((name) => addTagToSelection(name, kind, categoryKey)));
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
    attachedRows.length > 0 ? (
      <div className="space-y-1.5">
        {attachedRows.map(({ tag, tabId, label }) => (
          <div
            key={tag.id}
            className="grid grid-cols-[minmax(72px,auto)_1fr] items-start gap-2 text-[12px] leading-snug"
          >
            {canEdit ? (
              <Popover
                open={categoryOpenFor === tag.id}
                onOpenChange={(open) => setCategoryOpenFor(open ? tag.id : null)}
              >
                <PopoverTrigger
                  className="inline-flex max-w-[7.5rem] items-center gap-0.5 truncate rounded px-0.5 py-px text-left text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                  title={S.tagChangeCategory}
                  aria-label={`${S.tagChangeCategory}: ${label}`}
                >
                  <span className="truncate">{label}</span>
                  <ChevronDown className="size-3 shrink-0 opacity-70" />
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1.5" align="start" side="bottom">
                  <div className="mb-1 px-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
                    {S.tagChangeCategory}
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {tabs.map((tab) => {
                      const on = tab.id === tabId;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            void setTagCategory(tag.id, tab.id);
                            setCategoryOpenFor(null);
                          }}
                          className={cn(
                            "flex w-full items-center rounded-md px-2 py-1.5 text-left text-[12px]",
                            on
                              ? "bg-[#D9B382]/15 text-[#D9B382]"
                              : "text-zinc-200 hover:bg-white/5",
                          )}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="truncate pt-px text-[11px] text-zinc-500">{label}</div>
            )}
            <div className="group/kw min-w-0 text-zinc-100">
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
      ) : null}
    </div>
  );
}
