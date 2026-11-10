"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Inspector } from "@/app/(canvas)/_components/inspector";
import { BoardSidepanel } from "@/components/board-sidepanel";
import { BulkAttrPanel } from "@/components/bulk-attr-panel";
import { S } from "@/lib/strings";
import type { Board } from "@/lib/types";
import { isPeopleBoard, isVideoBoard, isWardrobeBoard, useCanvas } from "@/store/canvas-store";

/** Right-hand panel (image details, bulk labels, or board filters) that can be folded away. */
export function RightPanel({
  board,
  selectedCount,
}: {
  board: Board | undefined;
  selectedCount: number;
}) {
  const collapsed = useCanvas((s) => s.panelCollapsed);
  const setCollapsed = useCanvas((s) => s.setPanelCollapsed);
  const attrBoard = isPeopleBoard(board) || isWardrobeBoard(board) || isVideoBoard(board);

  const content =
    selectedCount === 1 ? (
      <Inspector />
    ) : selectedCount > 1 && attrBoard ? (
      <BulkAttrPanel board={board} />
    ) : attrBoard ? (
      <BoardSidepanel board={board} />
    ) : null;

  if (!content) return null;

  if (collapsed) {
    return (
      <div className="flex w-8 shrink-0 flex-col items-center border-l border-white/10 bg-[#111113] pt-2">
        <button
          type="button"
          aria-label={S.panelExpand}
          title={S.panelExpand}
          onClick={() => setCollapsed(false)}
          className="inline-flex size-6 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full shrink-0">
      <button
        type="button"
        aria-label={S.panelCollapse}
        title={S.panelCollapse}
        onClick={() => setCollapsed(true)}
        className="absolute top-2 left-0 z-10 inline-flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-[#1a1a1d] text-zinc-400 shadow hover:text-zinc-100"
      >
        <ChevronRight className="size-3.5" />
      </button>
      {content}
    </div>
  );
}
