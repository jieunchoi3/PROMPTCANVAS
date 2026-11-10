"use client";

import { useEffect, useRef, useState } from "react";
import { PromptsBoard } from "./prompts-board";
import { optionLabel, attrValues, hasAttrFilters } from "@/lib/attributes";
import { S } from "@/lib/strings";
import { kindLabel } from "@/lib/tag-kinds";
import { customCategoryLabel, tagMatchesTopTab } from "@/lib/top-categories";
import { RightPanel } from "@/components/right-panel";
import { useLibraryGridZoom, GRID_CELL_DEFAULT } from "@/hooks/use-library-grid-zoom";
import { useAssetIngest } from "@/hooks/use-asset-ingest";
import { AssetLightbox } from "@/components/asset-lightbox";
import type { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  filteredAssets,
  isPeopleBoard,
  isPromptsBoard,
  isVideoBoard,
  isWardrobeBoard,
  useCanvas,
} from "@/store/canvas-store";
import { BulkBar } from "./bulk-bar";
import { UndoToast } from "./undo-toast";
import { UploadQueue } from "./upload-queue";

function formatClipDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const GRID_GAP = 8;
const GRID_PADDING = 12;

function useElementWidth(el: HTMLElement | null): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return width;
}

/** Places items left-to-right into the currently shortest column so reading order stays row-like. */
function masonryColumns<T>(
  items: T[],
  columnCount: number,
  ratioOf: (item: T) => number,
  extra: number,
): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array<number>(columnCount).fill(0);
  for (const item of items) {
    let target = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(item);
    heights[target] += ratioOf(item) + extra;
  }
  return columns;
}

export function LibraryBoard() {
  const assets = useCanvas((s) => s.assets);
  const tags = useCanvas((s) => s.tags);
  const assetTags = useCanvas((s) => s.assetTags);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const filterCustomTabs = useCanvas((s) => s.filterCustomTabs);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const select = useCanvas((s) => s.select);
  const setPanelCollapsed = useCanvas((s) => s.setPanelCollapsed);
  const lightboxId = useCanvas((s) => s.lightboxId);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const attrFilters = useCanvas((s) => s.attrFilters);
  const expandedTopTabId = useCanvas((s) => s.expandedTopTabId);
  const currentBoard = boards.find((b) => b.id === boardId);
  const { cellSize, containerRef, containerEl, setCellSize } = useLibraryGridZoom();
  const containerWidth = useElementWidth(containerEl);
  const selectionAnchorId = useRef<string | null>(null);
  const { dragging, onDragOver, onDragLeave, onDrop } = useAssetIngest(containerEl);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setCellSize(cellSize * 1.12);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setCellSize(cellSize / 1.12);
      } else if (e.key === "0") {
        e.preventDefault();
        setCellSize(GRID_CELL_DEFAULT);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cellSize, setCellSize]);

  if (isPromptsBoard(currentBoard)) {
    return <PromptsBoard />;
  }

  const visible = filteredAssets({
    ...useCanvas.getState(),
    assets,
    filterKinds,
    filterTagIds,
  });
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const activeKindNames = [
    ...filterKinds.map(kindLabel),
    ...filterCustomTabs.map(customCategoryLabel),
  ].join(" · ");
  const activeTagNames = tags
    .filter((t) => filterTagIds.includes(t.id))
    .map((t) => t.name)
    .join(" · ");
  const activeAttrNames = Object.entries(attrFilters)
    .flatMap(([key, values]) => values.map((value) => optionLabel(key, value)))
    .join(" · ");
  const activeNames = [activeKindNames, activeTagNames, activeAttrNames]
    .filter(Boolean)
    .join(" · ");

  const compact = cellSize < 120;
  const innerWidth = Math.max(0, containerWidth - GRID_PADDING * 2);
  const columnCount = Math.max(1, Math.floor((innerWidth + GRID_GAP) / (cellSize + GRID_GAP)));
  const columns = masonryColumns(
    visible,
    columnCount,
    (asset) => (asset.width > 0 && asset.height > 0 ? asset.height / asset.width : 1),
    expandedTopTabId ? 0.15 : compact ? 0 : 0.45,
  );

  function onAssetClick(assetId: string, e: React.MouseEvent) {
    const index = visible.findIndex((asset) => asset.id === assetId);
    if (index < 0) return;

    if (e.shiftKey) {
      const anchorId = selectionAnchorId.current ?? selectedIds[0] ?? assetId;
      const anchorIndex = visible.findIndex((asset) => asset.id === anchorId);
      const start = Math.min(anchorIndex >= 0 ? anchorIndex : index, index);
      const end = Math.max(anchorIndex >= 0 ? anchorIndex : index, index);
      const rangeIds = visible.slice(start, end + 1).map((asset) => asset.id);
      select(rangeIds, false);
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      select([assetId], true);
      selectionAnchorId.current = assetId;
      return;
    }

    select([assetId], false);
    selectionAnchorId.current = assetId;
    setPanelCollapsed(false);
  }

  function renderCard(asset: Asset) {
    const on = selectedIds.includes(asset.id);
    const matchedKeywords = hasAttrFilters(attrFilters)
      ? Object.entries(attrFilters).flatMap(([key, values]) =>
          values
            .filter((value) => attrValues(asset.attributes, key).includes(value))
            .map((value) => optionLabel(key, value)),
        )
      : assetTags
          .filter((link) => link.asset_id === asset.id)
          .flatMap((link) => {
            const tag = tagById.get(link.tag_id);
            const activeTabs = [...filterKinds, ...filterCustomTabs];
            return tag &&
              (activeTabs.length === 0 ||
                activeTabs.some((tabId) => tagMatchesTopTab(tag, tabId)))
              ? [tag]
              : [];
          })
          .map((tag) => tag.name);
    const categoryKeywords = expandedTopTabId
      ? assetTags
          .filter((link) => link.asset_id === asset.id)
          .flatMap((link) => {
            const tag = tagById.get(link.tag_id);
            return tag && tagMatchesTopTab(tag, expandedTopTabId) ? [tag.name] : [];
          })
      : null;
    return (
      <button
        key={asset.id}
        type="button"
        onClick={(e) => onAssetClick(asset.id, e)}
        className="group overflow-hidden bg-zinc-900 text-left"
        style={on ? { boxShadow: "0 0 0 2px #D9B382" } : undefined}
      >
        {categoryKeywords ? (
          <div
            className={cn(
              "px-2 py-1.5 text-[12px] leading-snug",
              categoryKeywords.length > 0 ? "text-zinc-100" : "text-zinc-600",
            )}
          >
            {categoryKeywords.length > 0 ? categoryKeywords.join(" · ") : "—"}
          </div>
        ) : null}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.thumbUrl || asset.url}
            alt={asset.title ?? ""}
            loading="lazy"
            className="block h-auto w-full"
            style={
              asset.width > 0 && asset.height > 0
                ? { aspectRatio: `${asset.width} / ${asset.height}` }
                : undefined
            }
          />
          {asset.kind === "video" && asset.duration_ms ? (
            <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-200">
              {formatClipDuration(asset.duration_ms)}
            </span>
          ) : null}
        </div>
        {!compact &&
        !categoryKeywords &&
        (matchedKeywords.length > 0 ||
          Object.keys(asset.attributes).length > 0 ||
          asset.prompt) ? (
          <div className="space-y-0.5 px-2 py-1.5">
            {matchedKeywords.length > 0 ? (
              <div className="truncate text-[11px] text-zinc-400">
                {matchedKeywords.slice(0, 3).join(" · ")}
              </div>
            ) : null}
            {Object.keys(asset.attributes).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {Object.entries(asset.attributes)
                  .flatMap(([key, raw]) =>
                    (Array.isArray(raw) ? raw : [raw]).map((value) => (
                      <span
                        key={`${asset.id}-${key}-${value}`}
                        className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"
                      >
                        {optionLabel(key, value)}
                      </span>
                    )),
                  )
                  .slice(0, 3)}
              </div>
            ) : null}
            {asset.prompt ? (
              <div className="line-clamp-3 text-[11px] leading-snug text-zinc-300">
                {asset.prompt}
              </div>
            ) : null}
          </div>
        ) : null}
      </button>
    );
  }

  const lightbox = assets.find((a) => a.id === lightboxId);

  return (
    <div className="flex h-full min-h-0">
      <div
        ref={containerRef}
        className="relative min-w-0 flex-1 overflow-y-auto p-3"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => void onDrop(e)}
      >
        {dragging ? (
          <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-md border-2 border-dashed border-[#D9B382]/50 bg-black/30 text-sm text-[#D9B382]">
            {S.dropHere}
          </div>
        ) : null}
        {activeNames ? (
          <div className="mb-2 text-[12px] text-zinc-500">{activeNames}</div>
        ) : null}
        {visible.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-zinc-500">
            {filterKinds.length > 0 ||
            filterCustomTabs.length > 0 ||
            filterTagIds.length > 0 ||
            hasAttrFilters(attrFilters)
              ? S.tagFilterEmpty
              : isPeopleBoard(currentBoard)
                ? S.noCharacters
                : isWardrobeBoard(currentBoard)
                  ? S.noWardrobeAssets
                  : isVideoBoard(currentBoard)
                    ? S.noVideoAssets
                    : S.emptyLibrary}
          </div>
        ) : (
          <div className="flex items-start" style={{ gap: GRID_GAP }}>
            {columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="flex min-w-0 flex-1 flex-col"
                style={{ gap: GRID_GAP }}
              >
                {column.map(renderCard)}
              </div>
            ))}
          </div>
        )}
        <BulkBar />
        <UploadQueue />
        <UndoToast />
      </div>
      <RightPanel board={currentBoard} selectedCount={selectedIds.length} />
      <AssetLightbox asset={lightbox} />
    </div>
  );
}
