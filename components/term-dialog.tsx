"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ingestFiles } from "@/lib/ingest";
import { S } from "@/lib/strings";
import { groupTags } from "@/lib/tag-kinds";
import { customCategoryId, mergeTopTabs, tagMatchesTopTab } from "@/lib/top-categories";
import type { TagKind } from "@/lib/types";
import { useTr } from "@/hooks/use-tr";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/store/canvas-store";

type PickedKeyword = {
  name: string;
  kind: TagKind;
  categoryKey: string | null;
  tabLabel: string;
};

function keywordKey(k: { name: string; kind: TagKind; categoryKey: string | null }) {
  return `${k.kind}|${k.categoryKey ?? ""}|${k.name.toLowerCase()}`;
}

export function TermDialog() {
  const open = useCanvas((s) => s.termDialogOpen);
  const setOpen = useCanvas((s) => s.setTermDialogOpen);
  const tags = useCanvas((s) => s.tags);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<PickedKeyword[]>([]);
  const [fullPrompt, setFullPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [runReverse, setRunReverse] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);

  const tr = useTr();
  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const grouped = useMemo(() => groupTags(tags), [tags]);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const pasted = item.getAsFile();
          if (pasted) {
            e.preventDefault();
            setFile(pasted);
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open]);

  function reset() {
    setFile(null);
    setDraft("");
    setPicked([]);
    setFullPrompt("");
    setNotes("");
    setRunReverse(false);
    setActiveTabId(null);
  }

  function togglePicked(keyword: PickedKeyword) {
    const key = keywordKey(keyword);
    setPicked((current) =>
      current.some((k) => keywordKey(k) === key)
        ? current.filter((k) => keywordKey(k) !== key)
        : [...current, keyword],
    );
  }

  async function addDraft(): Promise<PickedKeyword[]> {
    if (!activeTab) return [];
    const names = draft
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) return [];
    setDraft("");
    const kind: TagKind = activeTab.builtin ? activeTab.id : "free";
    const categoryKey = activeTab.builtin ? null : activeTab.id;
    const { createTag } = useCanvas.getState();
    const added: PickedKeyword[] = [];
    for (const name of names) {
      const tag = await createTag(name, kind, categoryKey);
      if (!tag) {
        toast.error(S.termKeywordFailed(name));
        continue;
      }
      added.push({
        name: tag.name,
        kind: tag.kind,
        categoryKey: tag.category_key ?? null,
        tabLabel: activeTab.label,
      });
    }
    setPicked((current) => {
      const keys = new Set(current.map(keywordKey));
      return [...current, ...added.filter((k) => !keys.has(keywordKey(k)))];
    });
    return added;
  }

  async function addCategory() {
    const label = window.prompt(S.addCustomTabPh)?.trim();
    if (!label) return;
    await useCanvas.getState().addCustomTopCategory(label);
    setActiveTabId(customCategoryId(label));
  }

  async function save() {
    if (!file) {
      toast.error(S.termNeedImage);
      return;
    }
    setSaving(true);
    try {
      // A keyword typed but not yet confirmed with Enter still counts.
      const pending = await addDraft();
      const pickedKeys = new Set(picked.map(keywordKey));
      const keywords = [...picked, ...pending.filter((k) => !pickedKeys.has(keywordKey(k)))];
      const [asset] = await ingestFiles([file], "center");
      if (!asset) throw new Error("upload_failed");
      const state = useCanvas.getState();
      state.select([asset.id]);
      for (const keyword of keywords) {
        await state.addTagToSelection(keyword.name, keyword.kind, keyword.categoryKey);
      }
      if (fullPrompt.trim()) {
        state.updateFields(asset.id, { prompt: fullPrompt.trim() }, false);
      }
      if (notes.trim()) {
        state.updateFields(asset.id, { source_note: notes.trim() }, false);
      }
      toast.success(S.termSaved);
      const shouldReverse = runReverse && !fullPrompt.trim() && asset.kind === "image";
      reset();
      setOpen(false);
      if (shouldReverse) {
        void state
          .analyzeAsset(asset.id)
          .then(() => toast.success(S.analysisDone))
          .catch((err) => {
            const detail = err instanceof Error ? err.message : "";
            toast.error(detail ? S.analysisFailedDetail(detail) : S.analysisFailed);
          });
      }
    } catch {
      toast.error(S.termSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  const tabItems = activeTab
    ? activeTab.builtin
      ? grouped.find((g) => g.kind === activeTab.id)?.items ?? []
      : tags.filter((tag) => tagMatchesTopTab(tag, activeTab.id))
    : [];
  const pickedKeys = new Set(picked.map(keywordKey));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) reset();
        setOpen(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-[#141416] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{S.termAdd}</DialogTitle>
          <DialogDescription>{S.termAddHint}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">{S.termImage}</div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
                if (dropped) setFile(dropped);
              }}
              className={cn(
                "grid min-h-56 w-full place-items-center overflow-hidden rounded-md border border-dashed bg-black/40 text-center",
                dragging ? "border-[#D9B382]" : "border-white/15 hover:border-white/30",
              )}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="max-h-72 w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-[12px] text-zinc-500">
                  <ImagePlus className="size-6" />
                  {S.termImageDrop}
                </div>
              )}
            </button>
            {file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                {S.termImageChange}
              </button>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                e.target.value = "";
                if (chosen) setFile(chosen);
              }}
            />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                {S.termKeywords}
              </div>
              <div className="flex flex-wrap gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      "h-6 rounded-full px-2 text-[12px]",
                      activeTab?.id === tab.id
                        ? "bg-white text-[#0B0B0D]"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
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
                      className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] outline-none focus:border-[#D9B382]/60"
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
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                      {tabItems.map((tag) => {
                        const keyword: PickedKeyword = {
                          name: tag.name,
                          kind: tag.kind,
                          categoryKey: tag.category_key ?? null,
                          tabLabel: activeTab.label,
                        };
                        const on = pickedKeys.has(keywordKey(keyword));
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => togglePicked(keyword)}
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

            {picked.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {S.termPicked}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {picked.map((k) => (
                    <span
                      key={keywordKey(k)}
                      className="inline-flex h-6 items-center gap-1 rounded-full bg-[#D9B382]/15 pr-1 pl-2 text-[12px] text-[#D9B382]"
                    >
                      <span className="text-[10px] text-[#D9B382]/60">{k.tabLabel}</span>
                      {tr(k.name)}
                      <button
                        type="button"
                        aria-label={S.tagDelete}
                        onClick={() => togglePicked(k)}
                        className="rounded-full p-0.5 hover:bg-[#D9B382]/20"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                {S.termNotes}
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={S.termNotesPh}
                className="min-h-14 border-white/10 bg-black/40 text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                {S.termFullPrompt}
              </div>
              <Textarea
                value={fullPrompt}
                onChange={(e) => setFullPrompt(e.target.value)}
                placeholder={S.termFullPromptPh}
                className="min-h-20 border-white/10 bg-black/40 text-[13px]"
              />
              <label
                className={cn(
                  "flex items-center gap-2 text-[12px]",
                  fullPrompt.trim() ? "text-zinc-600" : "text-zinc-400",
                )}
              >
                <input
                  type="checkbox"
                  checked={runReverse && !fullPrompt.trim()}
                  disabled={Boolean(fullPrompt.trim())}
                  onChange={(e) => setRunReverse(e.target.checked)}
                  className="accent-[#D9B382]"
                />
                {S.termRunReverse}
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {S.close}
          </Button>
          <Button
            className="bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
            disabled={!file || saving}
            onClick={() => void save()}
          >
            {saving ? S.termSaving : S.termSave}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
