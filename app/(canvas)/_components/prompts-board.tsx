"use client";

import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { sheetTypeLabel } from "@/config/prompt-sheet-types";
import { Button } from "@/components/ui/button";
import { S } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { filteredPromptSheets, useCanvas } from "@/store/canvas-store";
import { PromptEditor } from "./prompt-editor";

export function PromptsBoard() {
  const promptSheets = useCanvas((s) => s.promptSheets);
  const filterSheetTypes = useCanvas((s) => s.filterSheetTypes);
  const selectedPromptId = useCanvas((s) => s.selectedPromptId);
  const selectPrompt = useCanvas((s) => s.selectPrompt);
  const deletePromptSheet = useCanvas((s) => s.deletePromptSheet);

  const visible = filteredPromptSheets({
    ...useCanvas.getState(),
    promptSheets,
    filterSheetTypes,
  });
  const selected = visible.find((p) => p.id === selectedPromptId) ?? null;

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(S.copied);
    } catch {
      toast(S.phase2);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-3 py-2 text-[12px] text-zinc-500">
          {S.promptsHint}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-zinc-500">
              {filterSheetTypes.length > 0 ? S.tagFilterEmpty : S.noPrompts}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
              {visible.map((prompt) => {
                const on = selectedPromptId === prompt.id;
                return (
                  <div
                    key={prompt.id}
                    className={cn(
                      "rounded-md border border-white/10 bg-[#111113] p-3 text-left transition-colors",
                      on ? "ring-2 ring-[#D9B382]" : "hover:border-white/20",
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => selectPrompt(prompt.id)}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                          {sheetTypeLabel(prompt.sheet_type)}
                        </span>
                        {prompt.model ? (
                          <span className="truncate text-[10px] text-zinc-600">
                            {prompt.model}
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-[13px] text-zinc-200">
                        {prompt.title || S.promptTitlePh}
                      </div>
                      <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-[12px] leading-relaxed text-zinc-400">
                        {prompt.body || " "}
                      </div>
                    </button>
                    <div className="mt-2 flex gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-6"
                        disabled={!prompt.body.trim()}
                        onClick={() => void copyPrompt(prompt.body)}
                      >
                        <Copy className="size-3" />
                        {S.copy}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="h-6 text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (window.confirm(S.deletePromptConfirm)) {
                            void deletePromptSheet(prompt.id);
                          }
                        }}
                      >
                        <Trash2 className="size-3" />
                        {S.deletePrompt}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <PromptEditor prompt={selected} />
    </div>
  );
}
