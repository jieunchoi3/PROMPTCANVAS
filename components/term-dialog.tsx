"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
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
import { useTr } from "@/hooks/use-tr";
import { ingestFiles } from "@/lib/ingest";
import { analysisToPickedKeywords } from "@/lib/prompt-keyword-schema";
import type { ReverseAnalysis } from "@/lib/reverse-analysis-schema";
import { S } from "@/lib/strings";
import { customCategoryId, mergeTopTabs } from "@/lib/top-categories";
import type { TagKind } from "@/lib/types";
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

async function fileToBase64(file: File): Promise<{ data: string; mimeType: string }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return { data: btoa(binary), mimeType: file.type || "image/jpeg" };
}

export function TermDialog() {
  const open = useCanvas((s) => s.termDialogOpen);
  const setOpen = useCanvas((s) => s.setTermDialogOpen);
  const customTopCategories = useCanvas((s) => s.customTopCategories);
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<PickedKeyword[]>([]);
  const [fullPrompt, setFullPrompt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<"image" | "prompt" | null>(null);
  const [dragging, setDragging] = useState(false);

  const tr = useTr();
  const tabs = useMemo(
    () => mergeTopTabs(customTopCategories).map((tab) => ({ ...tab, label: tr(tab.label) })),
    [customTopCategories, tr],
  );
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
  const busy = saving || analyzing !== null;

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
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
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
    setActiveTabId(null);
    setAnalyzing(null);
  }

  function mergePicked(added: PickedKeyword[]) {
    setPicked((current) => {
      const keys = new Set(current.map(keywordKey));
      return [...current, ...added.filter((k) => !keys.has(keywordKey(k)))];
    });
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
    mergePicked(added);
    return added;
  }

  async function addCategory() {
    const label = window.prompt(S.addCustomTabPh)?.trim();
    if (!label) return;
    await useCanvas.getState().addCustomTopCategory(label);
    setActiveTabId(customCategoryId(label));
  }

  async function analyzeImage() {
    if (!file) {
      toast.error(S.termAnalyzeNeedImage);
      return;
    }
    setAnalyzing("image");
    try {
      const { data, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: crypto.randomUUID(),
          imageBase64: data,
          mimeType,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: ReverseAnalysis;
        error?: string;
      };
      if (!res.ok || !json.analysis) throw new Error(json.error ?? "analyze_failed");
      const added = analysisToPickedKeywords(json.analysis, tabs);
      mergePicked(added);
      if (json.analysis.final_prompt.trim()) setFullPrompt(json.analysis.final_prompt.trim());
      toast.success(S.termAnalyzeFilled(added.length));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      toast.error(detail ? S.analysisFailedDetail(detail) : S.analysisFailed);
    } finally {
      setAnalyzing(null);
    }
  }

  async function analyzePrompt() {
    const prompt = fullPrompt.trim();
    if (!prompt) {
      toast.error(S.termAnalyzeNeedPrompt);
      return;
    }
    setAnalyzing("prompt");
    try {
      const res = await fetch("/api/analyze-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        analysis?: { keywords: ReverseAnalysis["keywords"]; suggested_tags: string[] };
        error?: string;
      };
      if (!res.ok || !json.analysis) throw new Error(json.error ?? "analyze_prompt_failed");
      const added = analysisToPickedKeywords(json.analysis, tabs);
      mergePicked(added);
      toast.success(S.termAnalyzeFilled(added.length));
    } catch (err) {
      const detail = err instanceof Error ? err.message : "";
      toast.error(detail ? S.analysisFailedDetail(detail) : S.analysisFailed);
    } finally {
      setAnalyzing(null);
    }
  }

  async function save() {
    if (!file) {
      toast.error(S.termNeedImage);
      return;
    }
    setSaving(true);
    try {
      const pending = await addDraft();
      const pickedKeys = new Set(picked.map(keywordKey));
      const keywords = [...picked, ...pending.filter((k) => !pickedKeys.has(keywordKey(k)))];
      const [asset] = await ingestFiles([file], "center");
      if (!asset) throw new Error("upload_failed");
      const state = useCanvas.getState();
      state.select([asset.id]);
      await Promise.all(
        keywords.map((keyword) =>
          state.addTagToSelection(keyword.name, keyword.kind, keyword.categoryKey),
        ),
      );
      if (fullPrompt.trim()) {
        state.updateFields(asset.id, { prompt: fullPrompt.trim() }, false);
      }
      if (notes.trim()) {
        state.updateFields(asset.id, { source_note: notes.trim() }, false);
      }
      toast.success(S.termSaved);
      reset();
      setOpen(false);
    } catch {
      toast.error(S.termSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) reset();
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
                <div className="flex gap-1.5">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === "Enter") void addDraft();
                    }}
                    placeholder={S.termKeywordPh(activeTab.label)}
                    className="h-8 min-w-0 flex-1 rounded-md border border-white/10 bg-black/40 px-2 text-[13px] outline-none focus:border-[#D9B382]/60"
                  />
                  <Button
                    size="sm"
                    className="h-8 bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
                    disabled={!draft.trim() || busy}
                    onClick={() => void addDraft()}
                  >
                    {S.tagCreate}
                  </Button>
                </div>
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
            </div>

            <div className="space-y-1.5 rounded-md border border-white/10 bg-black/20 p-2.5">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
                <Sparkles className="size-3.5" />
                {S.inspectorReverse}
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
                  disabled={busy || !fullPrompt.trim()}
                  onClick={() => void analyzePrompt()}
                >
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-100">
                    {analyzing === "prompt" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    {analyzing === "prompt" ? S.termAnalyzing : S.termAnalyzePrompt}
                  </span>
                  <span className="text-[10px] font-normal text-zinc-500">
                    {S.termAnalyzePromptHint}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
                  disabled={busy || !file}
                  onClick={() => void analyzeImage()}
                >
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-zinc-100">
                    {analyzing === "image" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    {analyzing === "image" ? S.termAnalyzing : S.termAnalyzeImage}
                  </span>
                  <span className="text-[10px] font-normal text-zinc-500">
                    {S.termAnalyzeImageHint}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            {S.close}
          </Button>
          <Button
            className="bg-[#D9B382] text-[#0B0B0D] hover:bg-[#D9B382]/90"
            disabled={!file || busy}
            onClick={() => void save()}
          >
            {saving ? S.termSaving : S.termSave}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
