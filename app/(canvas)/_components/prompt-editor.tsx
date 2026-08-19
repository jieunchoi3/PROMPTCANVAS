"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { PROMPT_SHEET_TYPES } from "@/config/prompt-sheet-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { PromptSheet } from "@/lib/types";
import { useCanvas } from "@/store/canvas-store";

export function PromptEditor({ prompt }: { prompt: PromptSheet | null }) {
  const updatePromptSheet = useCanvas((s) => s.updatePromptSheet);
  const uploadPromptPreview = useCanvas((s) => s.uploadPromptPreview);
  const models = useCanvas((s) => s.models);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [negative, setNegative] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [sheetType, setSheetType] = useState<PromptSheet["sheet_type"]>("other");

  useEffect(() => {
    if (!prompt) return;
    setTitle(prompt.title);
    setBody(prompt.body);
    setNegative(prompt.negative_prompt);
    setModel(prompt.model);
    setNotes(prompt.notes);
    setSheetType(prompt.sheet_type);
  }, [prompt]);

  if (!prompt) {
    return (
      <aside className="w-80 shrink-0 border-l border-white/10 bg-[#111113] p-3 text-[12px] text-zinc-500">
        {S.noPrompts}
      </aside>
    );
  }

  const promptId = prompt.id;

  function persist(fields: Parameters<typeof updatePromptSheet>[1]) {
    void updatePromptSheet(promptId, fields);
  }

  async function copyAll() {
    const parts = [body.trim(), negative.trim()].filter(Boolean);
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
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
                persist({ sheet_type: type.value });
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => persist({ title })}
          placeholder={S.promptTitlePh}
          className="mb-3 h-8 border-white/10 bg-black/20"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptPreview}
        </div>
        <div className="mb-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPromptPreview(promptId, file);
              e.target.value = "";
            }}
          />
          {prompt.previewUrl ? (
            <div className="relative overflow-hidden rounded-md border border-white/10 bg-black/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prompt.previewUrl}
                alt=""
                className="aspect-video w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-zinc-300 hover:text-white"
                aria-label={S.promptPreviewRemove}
                onClick={() => void uploadPromptPreview(promptId, null)}
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-1 rounded-md border border-dashed border-white/15 bg-black/20 px-3 py-5 text-zinc-500 hover:border-white/25 hover:text-zinc-300"
            >
              <ImagePlus className="size-5" />
              <span className="text-[11px]">{S.promptPreviewHint}</span>
            </button>
          )}
        </div>

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptBody}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={() => persist({ body })}
          placeholder={S.promptBodyPh}
          className="mb-3 min-h-40 border-white/10 bg-black/20 text-[13px] leading-relaxed"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.inspectorPrompt} (negative)
        </div>
        <Textarea
          value={negative}
          onChange={(e) => setNegative(e.target.value)}
          onBlur={() => persist({ negative_prompt: negative })}
          placeholder="negative prompt"
          className="mb-3 min-h-20 border-white/10 bg-black/20 text-[13px]"
        />

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.inspectorModel}
        </div>
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onBlur={() => persist({ model })}
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
                  persist({ model: m });
                }}
                className="h-5 rounded-full bg-white/5 px-2 text-[11px] text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
              >
                {m}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">
          {S.promptNotes}
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => persist({ notes })}
          placeholder={S.promptNotesPh}
          className="min-h-16 border-white/10 bg-black/20 text-[13px]"
        />
      </div>

      <div className="border-t border-white/10 p-3">
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
