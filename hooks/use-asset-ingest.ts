"use client";

import { useEffect, useState, type RefObject } from "react";
import { toast } from "sonner";
import { ingestFiles, ingestUrl } from "@/lib/ingest";
import { isTypingTarget, looksLikeUrl } from "@/lib/env";
import { S } from "@/lib/strings";
import { useCanvas } from "@/store/canvas-store";

type ContainerSource = RefObject<HTMLElement | null> | HTMLElement | null | undefined;

function resolveContainer(source: ContainerSource): HTMLElement | null {
  if (!source) return null;
  if (typeof source === "object" && "current" in source) return source.current;
  return source;
}

export function useAssetIngest(containerSource?: ContainerSource) {
  const [dragging, setDragging] = useState(false);

  function dropAtCenter(): { clientX: number; clientY: number } | "center" {
    const el = resolveContainer(containerSource);
    if (!el) return "center";
    const r = el.getBoundingClientRect();
    return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  }

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (!useCanvas.getState().canEdit) return;
      if (useCanvas.getState().termDialogOpen) return;
      const items = e.clipboardData;
      if (!items) return;

      const files: File[] = [];
      for (const item of items.items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        await ingestFiles(files, dropAtCenter());
        return;
      }

      const text = items.getData("text/plain").trim();
      if (!text) return;
      if (looksLikeUrl(text)) {
        e.preventDefault();
        await ingestUrl(text, dropAtCenter());
        return;
      }

      const state = useCanvas.getState();
      if (state.selectedIds.length === 1) {
        e.preventDefault();
        toast(S.pastePromptOffer, {
          action: {
            label: S.pastePrompt,
            onClick: () => {
              const id = state.selectedIds[0];
              if (id) state.updateFields(id, { prompt: text });
            },
          },
        });
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [containerSource]);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (useCanvas.getState().canEdit) setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    if (files.length) {
      await ingestFiles(files, { clientX: e.clientX, clientY: e.clientY });
    }
  }

  return { dragging, onDragOver, onDragLeave, onDrop };
}
