"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PROMPT_SHEET_TYPES } from "@/config/prompt-sheet-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useTr } from "@/hooks/use-tr";
import { isTypingTarget } from "@/lib/env";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { PromptSheet } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function PromptEditor({ prompt }: { prompt: PromptSheet | null }) {
  const updatePromptSheet = useCanvas((s) => s.updatePromptSheet);
  const uploadPromptPreview = useCanvas((s) => s.uploadPromptPreview);
  const models = useCanvas((s) => s.models);
  const canEdit = useCanvas((s) => s.canEdit);
  const tr = useTr();
  const show = (value: string) => (canEdit ? value : tr(value));
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [negative, setNegative] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [sheetType, setSheetType] = useState<PromptSheet["sheet_type"]>("other");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentId = prompt?.id ?? null;

  // Only reload the fields when switching prompts; a save landing mid-typing must not clobber the draft.
  useEffect(() => {
    if (!prompt) return;
    setTitle(prompt.title);
    setBody(prompt.body);
    setNegative(prompt.negative_prompt);
    setModel(prompt.model);
    setNotes(prompt.notes);
    setSheetType(prompt.sheet_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const draft = {
    title,
    body,
    negative_prompt: negative,
    model,
    notes,
    sheet_type: sheetType,
  };
  const differs = (fields: typeof draft) =>
    !!prompt &&
    (Object.keys(fields) as (keyof typeof draft)[]).some((k) => fields[k] !== prompt[k]);
  const dirty = differs(draft);

  async function save(overrides: Partial<typeof draft> = {}) {
    const fields = { ...draft, ...overrides };
    if (!currentId || !canEdit || !differs(fields)) return;
    setSaving(true);
    try {
      await updatePromptSheet(currentId, fields);
    } catch {
      toast.error(S.promptSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body, negative, model, notes, sheetType, dirty, saving]);

  async function setPreview(id: string, file: File | null) {
    setUploading(true);
    try {
      await uploadPromptPreview(id, file);
    } catch {
      toast.error(S.promptPreviewFailed);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!currentId || !canEdit) return;
    const id = currentId;
    function onPaste(e: ClipboardEvent) {
      const data = e.clipboardData;
      if (!data) return;
      if (isTypingTarget(e.target) && data.getData("text/plain").trim()) return;
      const file = [...data.items]
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void setPreview(id, file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, canEdit]);

  if (!prompt) {
    return (
      <aside className="w-80 shrink-0 border-l border-white/10 bg-[#111113] p-3 text-[12px] text-zinc-500">
        {S.noPrompts}
      </aside>
    );
  }

  const promptId = prompt.id;

  async function copyAll() {
    const parts = [show(body).trim(), show(negative).trim()].filter(Boolean);
    if (parts.length === 0) return;
    try {
      await navigator.clipboard.writeText(parts.join("\n\n"));
      toast(S.copied);
    } catch {
      toast(S.phase2);
    }
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-[#111113]">
      <fieldset disabled={!canEdit} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 text-sm text-zinc-200">{S.promptsBoard}</div>

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptType}
        </div>
        <div className="mb-3 flex flex-wrap gap-1">
          {PROMPT_SHEET_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setSheetType(type.value);
                void save({ sheet_type: type.value });
              }}
              className={cn(
                "h-6 rounded-full px-2 text-[11px]",
                sheetType === type.value
                  ? "bg-[#D9B382] text-[#0B0B0D]"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10",
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptTitle}
        </div>
        <Input
          value={show(title)}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => void save()}
          placeholder={S.promptTitlePh}
          className="mb-3 h-8 border-white/10 bg-black/20"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptNotes}
        </div>
        <Textarea
          value={show(notes)}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => void save()}
          placeholder={S.promptNotesPh}
          className="mb-3 min-h-16 border-white/10 bg-black/20 text-[13px]"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptPreview}
        </div>
        <div
          className="mb-3"
          onDragOver={(e) => {
            if (!canEdit || !e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            if (!canEdit) return;
            e.preventDefault();
            setDragOver(false);
            const file = [...e.dataTransfer.files].find((f) => f.type.startsWith("image/"));
            if (file) void setPreview(promptId, file);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void setPreview(promptId, file);
              e.target.value = "";
            }}
          />
          {prompt.previewUrl ? (
            <>
              <div
                className={cn(
                  "relative overflow-hidden rounded-md border bg-black/30",
                  dragOver ? "border-[#D9B382]" : "border-white/10",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prompt.previewUrl}
                  alt=""
                  className={cn("block h-auto w-full", uploading && "opacity-40")}
                />
                {uploading ? (
                  <div className="absolute inset-0 grid place-items-center">
                    <Loader2 className="size-5 animate-spin text-zinc-300" />
                  </div>
                ) : null}
                {canEdit && !uploading ? (
                  <button
                    type="button"
                    className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-zinc-300 hover:text-white"
                    aria-label={S.promptPreviewRemove}
                    onClick={() => void setPreview(promptId, null)}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {canEdit ? (
                <p className="mt-1 text-[10px] text-zinc-600">{S.promptPreviewReplaceHint}</p>
              ) : null}
            </>
          ) : !canEdit ? (
            <p className="text-[12px] text-zinc-600">—</p>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-md border border-dashed bg-black/20 px-3 py-5 text-zinc-500 hover:border-white/25 hover:text-zinc-300",
                dragOver ? "border-[#D9B382] text-zinc-300" : "border-white/15",
              )}
            >
              {uploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span className="text-[11px]">
                {uploading ? S.promptPreviewUploading : S.promptPreviewHint}
              </span>
            </button>
          )}
        </div>

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptBody}
        </div>
        <Textarea
          value={show(body)}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => void save()}
          placeholder={S.promptBodyPh}
          className="mb-3 min-h-40 border-white/10 bg-black/20 text-[13px] leading-relaxed"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.inspectorPrompt} (negative)
        </div>
        <Textarea
          value={show(negative)}
          onChange={(e) => setNegative(e.target.value)}
          onBlur={() => void save()}
          placeholder="negative prompt"
          className="mb-3 min-h-20 border-white/10 bg-black/20 text-[13px]"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.inspectorModel}
        </div>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onBlur={() => void save()}
          placeholder={S.modelPlaceholder}
          className="mb-2 h-8 border-white/10 bg-black/20"
        />
        {models.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1">
            {models.slice(0, 6).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setModel(m);
                  void save({ model: m });
                }}
                className="h-5 rounded-full bg-white/5 px-2 text-[11px] text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
              >
                {m}
              </button>
            ))}
          </div>
        ) : null}
      </fieldset>

      <div className="space-y-2 border-t border-white/10 p-3">
        {canEdit ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex flex-1 items-center gap-1 text-[11px]",
                saving ? "text-zinc-400" : dirty ? "text-amber-300/80" : "text-zinc-500",
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  {S.promptSaving}
                </>
              ) : dirty ? (
                S.promptUnsaved
              ) : (
                <>
                  <Check className="size-3" />
                  {S.promptSavedStatus}
                </>
              )}
            </span>
            <Button
              size="sm"
              className="h-7 bg-[#D9B382] px-4 text-[#0B0B0D] hover:bg-[#e5c497]"
              disabled={!dirty || saving}
              onClick={() => void save()}
            >
              <Save className="size-3.5" />
              {S.promptSave}
            </Button>
          </div>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          className="h-7 w-full"
          disabled={!body.trim()}
          onClick={() => void copyAll()}
        >
          <Copy className="size-3.5" />
          {S.copy}
        </Button>
      </div>
    </aside>
  );
}
