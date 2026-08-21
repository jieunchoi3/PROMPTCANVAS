"use client";

import { useEffect } from "react";
import { PromptsBoard } from "../_components/prompts-board";
import { optionLabel, attrValues, hasAttrFilters } from "@/lib/attributes";
import { S } from "@/lib/strings";
import { kindLabel } from "@/lib/tag-kinds";
import { customCategoryLabel, tagMatchesTopTab } from "@/lib/top-categories";
import { BoardSidepanel } from "@/components/board-sidepanel";
import { BulkAttrPanel } from "@/components/bulk-attr-panel";
import { useLibraryGridZoom, GRID_CELL_DEFAULT } from "@/hooks/use-library-grid-zoom";
import {
  filteredAssets,
  isPeopleBoard,
  isPromptsBoard,
  isWardrobeBoard,
  useCanvas,
} from "@/store/canvas-store";
import { Inspector } from "../_components/inspector";
import { BulkBar } from "../_components/bulk-bar";
import { UndoToast } from "../_components/undo-toast";

export default function LibraryPage() {
  const assets = useCanvas((s) => s.assets);
  const tags = useCanvas((s) => s.tags);
  const assetTags = useCanvas((s) => s.assetTags);
  const filterKinds = useCanvas((s) => s.filterKinds);
  const filterCustomTabs = useCanvas((s) => s.filterCustomTabs);
  const filterTagIds = useCanvas((s) => s.filterTagIds);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const select = useCanvas((s) => s.select);
  const setLightboxId = useCanvas((s) => s.setLightboxId);
  const boards = useCanvas((s) => s.boards);
  const boardId = useCanvas((s) => s.boardId);
  const attrFilters = useCanvas((s) => s.attrFilters);
  const currentBoard = boards.find((b) => b.id === boardId);
  const { cellSize, containerRef, setCellSize } = useLibraryGridZoom();

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

  return (
    <div className="flex h-full min-h-0">
      <div
        ref={containerRef}
        className="relative min-w-0 flex-1 overflow-y-auto p-3"
      >
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
                  : S.emptyLibrary}
          </div>
        ) : (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`,
            }}
          >
            {visible.map((asset) => {
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
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={(e) => select([asset.id], e.shiftKey || e.metaKey || e.ctrlKey)}
                  onDoubleClick={() => setLightboxId(asset.id)}
                  className="group overflow-hidden bg-zinc-900 text-left"
                  style={on ? { boxShadow: "0 0 0 2px #D9B382" } : undefined}
                >
                  <div className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.thumbUrl || asset.url}
                      alt={asset.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {!compact ? (
                    <div className="space-y-0.5 px-2 py-1.5">
                      <div className="truncate text-[11px] text-zinc-400">
                        {matchedKeywords.slice(0, 3).join(" · ") || asset.title || "—"}
                      </div>
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
                      <div className="line-clamp-3 text-[11px] leading-snug text-zinc-300">
                        {asset.prompt || " "}
                      </div>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
        <BulkBar />
        <UndoToast />
      </div>
      {selectedIds.length === 1 ? (
        <Inspector />
      ) : selectedIds.length > 1 &&
        (isPeopleBoard(currentBoard) || isWardrobeBoard(currentBoard)) ? (
        <BulkAttrPanel board={currentBoard} />
      ) : (
        <BoardSidepanel board={currentBoard} />
      )}
    </div>
  );
}
