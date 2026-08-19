"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BoardSidepanel } from "@/components/board-sidepanel";
import { CULL_PAD } from "@/lib/constants";
import {
  fitCamera,
  intersectsViewport,
  selectionBounds,
} from "@/lib/canvas-geometry";
import { ingestFiles, ingestUrl } from "@/lib/ingest";
import { isMod, isTypingTarget, looksLikeUrl } from "@/lib/env";
import { S } from "@/lib/strings";
import { filteredAssets, isPeopleBoard, isWardrobeBoard, useCanvas } from "@/store/canvas-store";
import { AssetNode } from "./asset-node";
import { BulkBar } from "./bulk-bar";
import { CanvasViewport } from "./canvas-viewport";
import { useCanvasGestures } from "./canvas-gestures";
import { Inspector } from "./inspector";
import { UndoToast } from "./undo-toast";
import { UploadQueue } from "./upload-queue";

export function CanvasBoard() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useCanvasGestures(viewportRef);

  const assets = useCanvas((s) => s.assets);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const camera = useCanvas((s) => s.camera);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const lightboxId = useCanvas((s) => s.lightboxId);
  const setLightboxId = useCanvas((s) => s.setLightboxId);
  const ready = useCanvas((s) => s.ready);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const currentBoard = boards.find((b) => b.id === boardId);

  const visible = filteredAssets({ ...useCanvas.getState(), assets, filterKinds, filterTagIds });
  const selected = visible.filter((a) => selectedIds.includes(a.id));
  const mounted = visible.filter((a) =>
    size.w === 0
      ? true
      : intersectsViewport(a, camera, size.w, size.h, CULL_PAD),
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const typing = isTypingTarget(e.target);
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        useCanvas.getState().setSpaceDown(true);
      }
      if (isMod(e) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCanvas.getState().setCommandOpen(true);
        return;
      }
      if (isMod(e) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toast(S.bulkGroupSoon);
        return;
      }
      if (isMod(e) && e.key === "0") {
        e.preventDefault();
        const bounds = selectionBounds(selected.length ? selected : visible);
        const el = viewportRef.current;
        if (!bounds || !el) return;
        const r = el.getBoundingClientRect();
        useCanvas.getState().setCamera(fitCamera(bounds, r.width, r.height));
        return;
      }
      if (isMod(e) && e.key === "1") {
        e.preventDefault();
        const el = viewportRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cam = useCanvas.getState().camera;
        const cx = (r.width / 2 - cam.x) / cam.scale;
        const cy = (r.height / 2 - cam.y) / cam.scale;
        useCanvas.getState().setCamera({
          scale: 1,
          x: r.width / 2 - cx,
          y: r.height / 2 - cy,
        });
        return;
      }
      if (isMod(e) && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        const el = viewportRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const ids = visible
          .filter((a) => intersectsViewport(a, camera, r.width, r.height, 0))
          .map((a) => a.id);
        useCanvas.getState().select(ids);
        return;
      }
      if (isMod(e) && e.key.toLowerCase() === "c" && !typing) {
        const one = selectedIds.length === 1
          ? assets.find((a) => a.id === selectedIds[0])
          : undefined;
        if (one?.prompt) {
          e.preventDefault();
          void navigator.clipboard.writeText(one.prompt);
          toast.success(S.copied);
        }
        return;
      }
      if (isMod(e) && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        useCanvas.getState().toggleVideoAutoplay();
        return;
      }
      if (isMod(e) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void useCanvas.getState().redo();
        else void useCanvas.getState().undo();
        return;
      }
      if (typing) return;
      if (e.key === "t" || e.key === "T") {
        const name = window.prompt(S.tagPlaceholder);
        if (name) void useCanvas.getState().addTagToSelection(name);
        return;
      }
      if (e.key === "r" || e.key === "R") {
        const state = useCanvas.getState();
        if (state.selectedIds.length === 1) {
          const asset = state.assets.find((a) => a.id === state.selectedIds[0]);
          const board = state.boards.find((b) => b.id === state.boardId);
          if (asset?.kind === "image" && board && !isPeopleBoard(board) && !isWardrobeBoard(board)) {
            void state
              .analyzeAsset(asset.id)
              .then(() => toast.success(S.analysisDone))
              .catch(() => toast.error(S.analysisFailed));
          }
        }
        return;
      }
      if (e.key === "e" || e.key === "E") {
        if (selectedIds.length !== 1 && selectedIds[0]) {
          useCanvas.getState().select(selectedIds.slice(0, 1));
        }
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void useCanvas.getState().deleteSelection();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") useCanvas.getState().setSpaceDown(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [assets, camera, selected, selectedIds, visible]);

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      if (isTypingTarget(e.target)) return;
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
        const el = viewportRef.current;
        const r = el?.getBoundingClientRect();
        await ingestFiles(
          files,
          r
            ? { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
            : "center",
        );
        return;
      }
      const text = items.getData("text/plain").trim();
      if (!text) return;
      if (looksLikeUrl(text)) {
        e.preventDefault();
        await ingestUrl(text, "center");
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
  }, []);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    if (files.length) await ingestFiles(files, { clientX: e.clientX, clientY: e.clientY });
  }

  const lightbox = assets.find((a) => a.id === lightboxId);

  return (
    <div className="flex h-full min-h-0">
      <div
        className="relative min-w-0 flex-1"
        onDragOver={onDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => void onDrop(e)}
      >
        <CanvasViewport viewportRef={viewportRef}>
          {mounted.map((asset) => (
            <AssetNode
              key={asset.id}
              asset={asset}
              selected={selectedIds.includes(asset.id)}
              scale={camera.scale}
            />
          ))}
        </CanvasViewport>
        {visible.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-zinc-500">
            {S.noAssets}
          </div>
        ) : null}
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center border-2 border-dashed border-[#D9B382]/50 bg-black/30 text-sm text-[#D9B382]">
            {S.dropHere}
          </div>
        ) : null}
        <BulkBar />
        <UploadQueue />
        <UndoToast />
      </div>
      {selectedIds.length === 1 ? <Inspector /> : <BoardSidepanel board={currentBoard} />}
      {lightbox ? (
        <button
          type="button"
          className="fixed inset-0 z-50 grid place-items-center bg-black/85"
          onClick={() => setLightboxId(null)}
        >
          {lightbox.kind === "video" ? (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={lightbox.title ?? ""}
              className="max-h-[90vh] max-w-[90vw] object-contain"
            />
          )}
        </button>
      ) : null}
    </div>
  );
}
